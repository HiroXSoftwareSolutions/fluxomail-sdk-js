import type { HttpClient } from '../core/http.js';
import type { GetTimelineOptions, GetTimelineResponse } from '../core/types.js';

export async function getTimeline<T = unknown>(client: HttpClient, opts: GetTimelineOptions): Promise<GetTimelineResponse<T>> {
  // Public API path: GET /api/v1/sends/:id
  const path = `/sends/${encodeURIComponent(opts.sendId)}`;
  const query = { cursor: opts.cursor, limit: opts.limit };
  return client.request('GET', path, { query, signal: opts.signal });
}

export async function getTimelineWithMeta<T = unknown>(client: HttpClient, opts: GetTimelineOptions) {
  const path = `/sends/${encodeURIComponent(opts.sendId)}`;
  const query = { cursor: opts.cursor, limit: opts.limit };
  return client.requestWithMeta<GetTimelineResponse<T>>('GET', path, { query, signal: opts.signal });
}
