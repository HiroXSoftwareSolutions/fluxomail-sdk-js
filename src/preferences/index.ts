import type { HttpClient } from '../core/http.js';
import type {
  GetPreferencesOptions,
  GetPreferencesResponse,
  UpdatePreferencesRequest,
  UpdatePreferencesResponse,
} from '../core/types.js';

export async function getPreferences(
  client: HttpClient,
  opts: GetPreferencesOptions = {}
): Promise<GetPreferencesResponse> {
  const query: Record<string, string | undefined> = {
    token: opts.token,
    email: opts.email,
  };
  return client.request<GetPreferencesResponse>('GET', '/preferences', {
    query,
    signal: opts.signal,
    timeoutMs: opts.timeoutMs,
  });
}

export async function updatePreferences(
  client: HttpClient,
  req: UpdatePreferencesRequest
): Promise<UpdatePreferencesResponse> {
  const body = {
    ...(req.token ? { token: req.token } : {}),
    ...(req.email ? { email: req.email } : {}),
    subscriptions: req.subscriptions,
  };
  return client.request<UpdatePreferencesResponse>('POST', '/preferences', {
    body: body as any,
    signal: req.signal,
    timeoutMs: req.timeoutMs,
  });
}
