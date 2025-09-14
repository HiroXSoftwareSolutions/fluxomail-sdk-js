import type { HttpClient } from '../core/http.js';
import type { ListEventsOptions, ListEventsResponse } from '../core/types.js';

export async function listEvents<T = unknown>(client: HttpClient, opts: ListEventsOptions = {}): Promise<ListEventsResponse<T>> {
  const query = {
    cursor: opts.cursor,
    limit: opts.limit,
    since: opts.since,
    types: opts.types,
  };
  return client.request('GET', '/events', { query });
}
