import type { HttpClient } from '../core/http.js';
import type { GetTimelineOptions, GetTimelineResponse } from '../core/types.js';

export async function getTimeline<T = unknown>(client: HttpClient, opts: GetTimelineOptions): Promise<GetTimelineResponse<T>> {
  const path = `/timelines/${encodeURIComponent(opts.sendId)}`;
  const query = { cursor: opts.cursor, limit: opts.limit };
  return client.request('GET', path, { query });
}
