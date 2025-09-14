import { Auth } from './auth.js';
import { FluxomailError, NetworkError, TimeoutError, classifyHttpError, RateLimitError } from './errors.js';
import type { ClientConfig, Json } from './types.js';

const DEFAULT_BASE_URL = 'https://api.fluxomail.com';
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

  constructor(cfg: ClientConfig) {
    this.baseUrl = (cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.auth = new Auth({ apiKey: cfg.apiKey, token: cfg.token });
    this.version = cfg.version ?? DEFAULT_VERSION;
    this.timeoutMs = cfg.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.customFetch = cfg.fetch;
    this.userAgentExtra = cfg.userAgent;
    this.runtimeUA = isNode() ? `node/${process.version}` : 'browser';
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
      const baseUA = `fluxomail-sdk-js/0.1.0 (${this.runtimeUA})`;
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? this.timeoutMs);

    const maxAttempts = 3;
    let lastErr: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
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
          await sleep(wait);
          continue;
        }

        clearTimeout(timeout);
        throw classifyHttpError(res.status, body, requestId);
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
