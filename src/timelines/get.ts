import type { HttpClient } from '../core/http.js';
import type { GetTimelineOptions, GetTimelineResponse } from '../core/types.js';
import { asOpenAPITimeline, type OpenAPITimelineResponse } from '../core/openapi.js';

export async function getTimeline<T = unknown>(client: HttpClient, opts: GetTimelineOptions): Promise<GetTimelineResponse<T>> {
  // Public API path: GET /api/v1/sends/:id
  const path = `/sends/${encodeURIComponent(opts.sendId)}`;
  const query = { cursor: opts.cursor, limit: opts.limit };
  const resp = await client.request<OpenAPITimelineResponse>('GET', path, { query, signal: opts.signal, timeoutMs: opts.timeoutMs, retry: opts.retry });
  return asOpenAPITimeline(resp) as unknown as GetTimelineResponse<T>;
}

export async function getTimelineWithMeta<T = unknown>(client: HttpClient, opts: GetTimelineOptions) {
  const path = `/sends/${encodeURIComponent(opts.sendId)}`;
  const query = { cursor: opts.cursor, limit: opts.limit };
  const out = await client.requestWithMeta<OpenAPITimelineResponse>('GET', path, { query, signal: opts.signal, timeoutMs: opts.timeoutMs, retry: opts.retry });
  return { data: asOpenAPITimeline(out.data) as unknown as GetTimelineResponse<T>, meta: out.meta };
}
