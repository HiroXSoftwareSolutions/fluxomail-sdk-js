import type { HttpClient } from '../core/http.js';
import type { SyncContactsRequest, SyncContactsResponse } from '../core/types.js';

type ContactSyncBody = {
  source?: string;
  contacts: SyncContactsRequest['contacts'];
};

export async function syncContacts(
  client: HttpClient,
  req: SyncContactsRequest
): Promise<SyncContactsResponse> {
  const body: ContactSyncBody = {
    contacts: req.contacts,
    ...(req.source ? { source: req.source } : {}),
  };
  const hasIdempotencyKey = !!req.idempotencyKey;
  const hasPerRowEventIds = req.contacts.every((row) => typeof row.eventId === 'string' && row.eventId.trim().length > 0);
  const canSafelyRetry = hasIdempotencyKey || hasPerRowEventIds;
  const attempts = Math.max(1, Number(req.idempotentRetry ?? 3));
  let lastErr: unknown = undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      return await client.request<SyncContactsResponse>('POST', '/contacts/sync', {
        body: body as unknown as Record<string, unknown>,
        idempotencyKey: req.idempotencyKey,
        signal: req.signal,
        timeoutMs: req.timeoutMs,
      });
    } catch (e: unknown) {
      lastErr = e;
      const err = e as { status?: number; code?: string };
      const status = err?.status;
      const code = (err?.code || '').toLowerCase();
      const retriable = (status !== undefined && (status >= 500 || status === 429)) || code.includes('network') || code.includes('timeout');
      if (i < attempts - 1 && canSafelyRetry && retriable) {
        const wait = Math.min(2000, 100 * Math.pow(2, i)) + Math.floor(Math.random() * 50);
        await new Promise((resolve) => setTimeout(resolve, wait));
        continue;
      }
      throw e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('contacts sync failed');
}
