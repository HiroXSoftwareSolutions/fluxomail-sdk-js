import type { HttpClient } from '../core/http.js';
import type { EventEnvelope, GetTimelineResponse, IterateTimelineOptions } from '../core/types.js';
import type { OpenAPITimelineResponse } from '../core/openapi.js';

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

export async function* iterateTimeline<T = unknown>(client: HttpClient, opts: IterateTimelineOptions): AsyncGenerator<EventEnvelope<T>, void, void> {
  let cursor = opts.cursor;
  let pages = 0;
  const maxPages = opts.maxPages ?? Infinity;
  for (;;) {
    if (pages >= maxPages) return;
    let page: GetTimelineResponse<T> | null = null;
    try {
      const resp = await client.request<OpenAPITimelineResponse>('GET', `/sends/${encodeURIComponent(opts.sendId)}`, { query: { cursor, limit: opts.limit }, signal: opts.signal });
      page = resp as unknown as GetTimelineResponse<T>;
    } catch (e: any) {
      if (String(e?.code || '').toLowerCase() === 'rate_limited' && typeof e?.retryAfterMs === 'number') {
        await sleep(e.retryAfterMs);
        continue;
      }
      throw e;
    }
    pages++;
    for (const ev of page.events) {
      yield ev as EventEnvelope<T>;
      if (opts.signal?.aborted) return;
    }
    if (!page.nextCursor) return;
    cursor = page.nextCursor;
    if (opts.signal?.aborted) return;
  }
}
