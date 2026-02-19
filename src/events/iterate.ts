import type { HttpClient } from '../core/http.js';
import type { EventEnvelope, IterateEventsOptions, ListEventsResponse } from '../core/types.js';
import type { OpenAPIListEventsResponse } from '../core/openapi.js';

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

export async function* iterateEvents<T = unknown>(client: HttpClient, opts: IterateEventsOptions = {}): AsyncGenerator<EventEnvelope<T>, void, void> {
  let cursor = opts.cursor;
  let pages = 0;
  const maxPages = opts.maxPages ?? Infinity;
  for (;;) {
    if (pages >= maxPages) return;
    let page: ListEventsResponse<T> | null = null;
    try {
      const resp = await client.request<OpenAPIListEventsResponse>('GET', '/events', { query: { types: opts.types, since: opts.since, cursor, limit: opts.limit, smtpCode: opts.smtpCode, mtaHost: opts.mtaHost, domain: opts.domain }, signal: opts.signal, timeoutMs: opts.timeoutMs, retry: opts.retry });
      page = resp as unknown as ListEventsResponse<T>;
    } catch (e: any) {
      if (String(e?.code || '').toLowerCase() === 'rate_limited' && typeof e?.retryAfterMs === 'number') {
        await sleep(e.retryAfterMs);
        continue;
      }
      throw e;
    }
    pages++;
    for (const ev of page.events) {
      yield ev;
      if (opts.signal?.aborted) return;
    }
    if (!page.nextCursor) return;
    cursor = page.nextCursor;
    if (opts.signal?.aborted) return;
  }
}
