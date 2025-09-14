import { Auth } from './auth.js';
import pkg from '../../package.json';
import { FluxomailError, NetworkError, TimeoutError, classifyHttpError, RateLimitError } from './errors.js';
import type { ClientConfig, Json } from './types.js';

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
  }

  private get fetchImpl(): typeof fetch {
    return this.customFetch ?? fetch;
  }

  private makeHeaders(extra?: Record<string, string>): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Fluxomail-Version': this.version,
      ...this.auth.asHeaders(),
      ...extra,
    });
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
    return status >= 500 || status === 429;
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
    } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}${buildQuery(opts.query ?? {})}`;
    const headers = this.makeHeaders({ ...opts.headers });
    if (opts.idempotencyKey) headers.set('Idempotency-Key', opts.idempotencyKey);

    const maxAttempts = 3;
    let lastErr: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? this.timeoutMs);
        if (this.beforeRequest) {
          await this.beforeRequest({ method, url, headers, body: opts.body });
        }
        const res = await this.fetchImpl(url, {
          method,
          headers,
          signal: controller.signal,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
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

        if (this.shouldRetry(method, res.status) && attempt < maxAttempts - 1) {
          const retryAfter = res.status === 429 ? Number(res.headers.get('retry-after')) : undefined;
          const wait = retryAfter && !Number.isNaN(retryAfter) ? retryAfter * 1000 : jitteredBackoff(attempt);
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
        if (this.shouldRetry(method) && attempt < maxAttempts - 1) {
          await sleep(jitteredBackoff(attempt));
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
}
