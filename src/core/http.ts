import { Auth } from './auth.js';
import pkg from '../../package.json';
import { FluxomailError, NetworkError, TimeoutError, classifyHttpError } from './errors.js';
import type { ClientConfig, Json, RetryPolicy } from './types.js';

const DEFAULT_BASE_URL = 'https://api.fluxomail.com/api/v1';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_VERSION = '2025-09-01';

function isNode(): boolean {
  return typeof process !== 'undefined' && !!(process.release && process.release.name === 'node');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitteredBackoff(attempt: number, base = 250, cap = 2000): number {
  const exp = Math.min(cap, base * Math.pow(2, attempt));
  return Math.floor(exp / 2 + Math.random() * exp / 2);
}

function buildQuery(params: Record<string, string | number | boolean | undefined | string[] | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) usp.append(k, item);
    } else {
      usp.set(k, String(v));
    }
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly auth: Auth;
  private readonly version: string;
  private readonly timeoutMs: number;
  private readonly runtimeUA: string;
  private readonly customFetch?: typeof fetch;
  private readonly userAgentExtra?: string;
  private readonly beforeRequest?: (ctx: { method: string; url: string; headers: Headers; body?: Json }) => void | Promise<void>;
  private readonly afterResponse?: (ctx: { method: string; url: string; status: number; headers: Headers; requestId?: string }) => void | Promise<void>;
  private readonly tokenRefresher?: () => string | undefined | Promise<string | undefined>;
  private readonly retryPolicy: Required<RetryPolicy>;

  constructor(cfg: ClientConfig) {
    this.baseUrl = (cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    if (!isNode() && cfg.apiKey && !cfg.allowApiKeyInBrowser) {
      throw new Error('Fluxomail SDK: Do not use apiKey in the browser. Use a short-lived token.');
    }
    this.auth = new Auth({ apiKey: cfg.apiKey, token: cfg.token });
    this.version = cfg.version ?? DEFAULT_VERSION;
    this.timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.customFetch = cfg.fetch;
    this.userAgentExtra = cfg.userAgent;
    this.runtimeUA = isNode() ? `node/${process.version}` : 'browser';
    this.beforeRequest = cfg.beforeRequest;
    this.afterResponse = cfg.afterResponse;
    this.tokenRefresher = cfg.getToken;
    const rp = cfg.retry ?? {};
    this.retryPolicy = {
      maxAttempts: rp.maxAttempts ?? 3,
      retriableStatuses: rp.retriableStatuses ?? [408, 429],
      baseDelayMs: rp.baseDelayMs ?? 250,
      maxDelayMs: rp.maxDelayMs ?? 2000,
    } as Required<RetryPolicy>;
  }

  private get fetchImpl(): typeof fetch {
    return this.customFetch ?? fetch;
  }

  private makeHeaders(extra?: Record<string, string>, hasBody?: boolean): Headers {
    const base: Record<string, string> = {
      'Fluxomail-Version': this.version,
      ...this.auth.asHeaders(),
      ...extra,
    };
    // Only set Content-Type when there's a request body.
    // Setting it on GET/HEAD triggers unnecessary CORS preflights in browsers.
    if (hasBody) base['Content-Type'] = 'application/json';
    const headers = new Headers(base);
    if (isNode()) {
      // Many servers ignore UA from browsers; set only in Node
      const version = (pkg as any)?.version || '0.0.0';
      const baseUA = `fluxomail-sdk-js/${version} (${this.runtimeUA})`;
      const ua = this.userAgentExtra ? `${baseUA} ${this.userAgentExtra}` : baseUA;
      headers.set('User-Agent', ua);
    }
    return headers;
  }

  private shouldRetry(method: string, status?: number): boolean {
    const idempotent = method === 'GET' || method === 'HEAD';
    if (!idempotent) return false;
    if (status === undefined) return true;
    if (this.retryPolicy.retriableStatuses.includes(status)) return true;
    if (status >= 500 && status <= 599) return true;
    return false;
  }

  async request<T = unknown>(
    method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    opts: {
      query?: Record<string, string | number | boolean | undefined | string[] | undefined>;
      body?: Json;
      headers?: Record<string, string>;
      idempotencyKey?: string;
      timeoutMs?: number;
      signal?: AbortSignal;
      retry?: RetryPolicy;
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}${buildQuery(opts.query ?? {})}`;

    const policy: Required<RetryPolicy> = {
      maxAttempts: opts.retry?.maxAttempts ?? this.retryPolicy.maxAttempts,
      retriableStatuses: opts.retry?.retriableStatuses ?? this.retryPolicy.retriableStatuses,
      baseDelayMs: opts.retry?.baseDelayMs ?? this.retryPolicy.baseDelayMs,
      maxDelayMs: opts.retry?.maxDelayMs ?? this.retryPolicy.maxDelayMs,
    } as Required<RetryPolicy>;
    const maxAttempts = policy.maxAttempts;
    const shouldRetry = (m: string, status?: number) => {
      const idempotent = m === 'GET' || m === 'HEAD';
      if (!idempotent) return false;
      if (status === undefined) return true;
      if (policy.retriableStatuses.includes(status)) return true;
      if (status >= 500 && status <= 599) return true;
      return false;
    };
    let lastErr: unknown;
    let didAuthRefresh = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        if (opts.signal) {
          if (opts.signal.aborted) controller.abort();
          else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? this.timeoutMs);
        const hasBody = opts.body !== undefined;
        const headers = this.makeHeaders({ ...opts.headers }, hasBody);
        if (opts.idempotencyKey) headers.set('Idempotency-Key', opts.idempotencyKey);
        if (this.beforeRequest) {
          await this.beforeRequest({ method, url, headers, body: opts.body });
        }
        const res = await this.fetchImpl(url, {
          method,
          headers,
          signal: controller.signal,
          body: hasBody ? JSON.stringify(opts.body) : undefined,
        });
        const requestId = res.headers.get('Fluxomail-Request-Id') ?? undefined;

        if (res.ok) {
          // Try to parse as JSON, but allow empty body
          const text = await res.text();
          clearTimeout(timeout);
          if (this.afterResponse) await this.afterResponse({ method, url, status: res.status, headers: res.headers, requestId });
          return (text ? (JSON.parse(text) as T) : (undefined as unknown as T));
        }

        // Non-2xx
        let body: unknown = undefined;
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
          body = await res.json();
        } else {
          body = await res.text();
        }

        // Handle 401 with token refresh (one attempt), regardless of method idempotency
        if (res.status === 401 && this.tokenRefresher && !didAuthRefresh) {
          clearTimeout(timeout);
          if (this.afterResponse) await this.afterResponse({ method, url, status: res.status, headers: res.headers, requestId });
          try {
            const next = await this.tokenRefresher();
            if (next) this.auth.setToken(next);
            didAuthRefresh = true;
            // Retry immediately with new token (with minimal backoff)
            await sleep(jitteredBackoff(0, policy.baseDelayMs, policy.maxDelayMs));
            continue;
          } catch {
            // fall through to classification
          }
        }

        if (shouldRetry(method, res.status) && attempt < maxAttempts - 1) {
          const retryAfter = res.status === 429 ? Number(res.headers.get('retry-after')) : undefined;
          const wait = retryAfter && !Number.isNaN(retryAfter) ? retryAfter * 1000 : jitteredBackoff(attempt, policy.baseDelayMs, policy.maxDelayMs);
          clearTimeout(timeout);
          if (this.afterResponse) await this.afterResponse({ method, url, status: res.status, headers: res.headers, requestId });
          await sleep(wait);
          continue;
        }

        clearTimeout(timeout);
        // Include Retry-After as ms for rate limit errors, when present
        const retryAfterHeader = res.status === 429 ? res.headers.get('retry-after') : null;
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
        if (this.afterResponse) await this.afterResponse({ method, url, status: res.status, headers: res.headers, requestId });
        throw classifyHttpError(res.status, body, requestId, retryAfterMs);
      } catch (err) {
        lastErr = err;
        if (err instanceof FluxomailError) throw err;
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw new TimeoutError();
        }
        // Network or other error
        if (shouldRetry(method) && attempt < maxAttempts - 1) {
          await sleep(jitteredBackoff(attempt, policy.baseDelayMs, policy.maxDelayMs));
          continue;
        }
        throw new NetworkError((err as Error)?.message ?? 'Network error');
      }
    }

    // Should not reach here
    throw lastErr instanceof Error ? lastErr : new NetworkError();
  }

  base(): string {
    return this.baseUrl;
  }

  tokenParam(): string | undefined {
    return this.auth.tokenParam();
  }

  async requestWithMeta<T = unknown>(
    method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    opts: {
      query?: Record<string, string | number | boolean | undefined | string[] | undefined>;
      body?: Json;
      headers?: Record<string, string>;
      idempotencyKey?: string;
      timeoutMs?: number;
      signal?: AbortSignal;
      retry?: RetryPolicy;
    } = {}
  ): Promise<{ data: T; meta: { status: number; headers: Headers; requestId?: string } }> {
    const url = `${this.baseUrl}${path}${buildQuery(opts.query ?? {})}`;
    const policy: Required<RetryPolicy> = {
      maxAttempts: opts.retry?.maxAttempts ?? this.retryPolicy.maxAttempts,
      retriableStatuses: opts.retry?.retriableStatuses ?? this.retryPolicy.retriableStatuses,
      baseDelayMs: opts.retry?.baseDelayMs ?? this.retryPolicy.baseDelayMs,
      maxDelayMs: opts.retry?.maxDelayMs ?? this.retryPolicy.maxDelayMs,
    } as Required<RetryPolicy>;
    const maxAttempts = policy.maxAttempts;
    const shouldRetry = (m: string, status?: number) => {
      const idempotent = m === 'GET' || m === 'HEAD';
      if (!idempotent) return false;
      if (status === undefined) return true;
      if (policy.retriableStatuses.includes(status)) return true;
      if (status >= 500 && status <= 599) return true;
      return false;
    };
    let lastErr: unknown;
    let didAuthRefresh = false;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        if (opts.signal) {
          if (opts.signal.aborted) controller.abort();
          else opts.signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? this.timeoutMs);
        const hasBody = opts.body !== undefined;
        const headers = this.makeHeaders({ ...opts.headers }, hasBody);
        if (opts.idempotencyKey) headers.set('Idempotency-Key', opts.idempotencyKey);
        if (this.beforeRequest) await this.beforeRequest({ method, url, headers, body: opts.body });
        const res = await this.fetchImpl(url, { method, headers, signal: controller.signal, body: hasBody ? JSON.stringify(opts.body) : undefined });
        const requestId = res.headers.get('Fluxomail-Request-Id') ?? undefined;
        const status = res.status;
        if (res.ok) {
          const text = await res.text();
          clearTimeout(timeout);
          if (this.afterResponse) await this.afterResponse({ method, url, status, headers: res.headers, requestId });
          const data = (text ? (JSON.parse(text) as T) : (undefined as unknown as T));
          return { data, meta: { status, headers: res.headers, requestId } };
        }
        let body: unknown = undefined;
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) body = await res.json();
        else body = await res.text();
        if (status === 401 && this.tokenRefresher && !didAuthRefresh) {
          clearTimeout(timeout);
          if (this.afterResponse) await this.afterResponse({ method, url, status, headers: res.headers, requestId });
          try {
            const next = await this.tokenRefresher();
            if (next) this.auth.setToken(next);
            didAuthRefresh = true;
            await sleep(jitteredBackoff(0, policy.baseDelayMs, policy.maxDelayMs));
            continue;
          } catch {}
        }
        if (shouldRetry(method, status) && attempt < maxAttempts - 1) {
          const retryAfter = status === 429 ? Number(res.headers.get('retry-after')) : undefined;
          const wait = retryAfter && !Number.isNaN(retryAfter) ? retryAfter * 1000 : jitteredBackoff(attempt, policy.baseDelayMs, policy.maxDelayMs);
          clearTimeout(timeout);
          if (this.afterResponse) await this.afterResponse({ method, url, status, headers: res.headers, requestId });
          await sleep(wait);
          continue;
        }
        clearTimeout(timeout);
        const retryAfterHeader = status === 429 ? res.headers.get('retry-after') : null;
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : undefined;
        if (this.afterResponse) await this.afterResponse({ method, url, status, headers: res.headers, requestId });
        throw classifyHttpError(status, body, requestId, retryAfterMs);
      } catch (err) {
        lastErr = err;
        if (err instanceof FluxomailError) throw err;
        if (err instanceof DOMException && err.name === 'AbortError') throw new TimeoutError();
        if (shouldRetry(method) && attempt < maxAttempts - 1) {
          await sleep(jitteredBackoff(attempt, policy.baseDelayMs, policy.maxDelayMs));
          continue;
        }
        throw new NetworkError((err as Error)?.message ?? 'Network error');
      }
    }
    throw lastErr instanceof Error ? lastErr : new NetworkError();
  }
}
