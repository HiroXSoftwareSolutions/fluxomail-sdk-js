import type { HttpClient } from '../core/http.js';
import type { ListEventsOptions, ListEventsResponse } from '../core/types.js';
import { asOpenAPIListEvents, type OpenAPIListEventsResponse } from '../core/openapi.js';

export async function listEvents<T = unknown>(client: HttpClient, opts: ListEventsOptions = {}): Promise<ListEventsResponse<T>> {
  const query = {
    cursor: opts.cursor,
    limit: opts.limit,
    since: opts.since,
    types: opts.types,
    smtpCode: opts.smtpCode,
    mtaHost: opts.mtaHost,
    domain: opts.domain,
  };
  const resp = await client.request<OpenAPIListEventsResponse>('GET', '/events', { query, signal: opts.signal, timeoutMs: opts.timeoutMs, retry: opts.retry });
  // Map OpenAPI response to public SDK shape (structurally identical)
  const mapped = asOpenAPIListEvents(resp);
  return mapped as unknown as ListEventsResponse<T>;
}

export async function listEventsWithMeta<T = unknown>(client: HttpClient, opts: ListEventsOptions = {}) {
  const query = {
    cursor: opts.cursor,
    limit: opts.limit,
    since: opts.since,
    types: opts.types,
    smtpCode: opts.smtpCode,
    mtaHost: opts.mtaHost,
    domain: opts.domain,
  };
  const out = await client.requestWithMeta<OpenAPIListEventsResponse>('GET', '/events', { query, signal: opts.signal, timeoutMs: opts.timeoutMs, retry: opts.retry });
  return { data: asOpenAPIListEvents(out.data) as unknown as ListEventsResponse<T>, meta: out.meta };
}
