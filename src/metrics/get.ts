import type { HttpClient } from '../core/http.js';
import type { GetMetricsOptions, MetricsResponse } from '../core/types.js';

export async function getMetrics(client: HttpClient, opts: GetMetricsOptions = {}): Promise<MetricsResponse> {
  const query = {
    window: opts.window,
    since: opts.since,
  };
  return client.request<MetricsResponse>('GET', '/metrics', {
    query,
    signal: opts.signal,
    timeoutMs: opts.timeoutMs,
    retry: opts.retry,
  });
}
