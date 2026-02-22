import { Fluxomail } from '../../dist/index.js';

const SOURCE_NAME = process.env.USER_SYNC_SOURCE || 'myapp';
const MAX_BATCH = Number(process.env.USER_SYNC_BATCH_SIZE || 100);
const MAX_ATTEMPTS = Number(process.env.USER_SYNC_MAX_ATTEMPTS || 10);

/**
 * Replace with your DB implementation.
 * Required shape:
 * - listDueOutboxEvents(limit): Promise<OutboxEvent[]>
 * - markProcessing(id): Promise<boolean> // false when raced
 * - markDone(id, result): Promise<void>
 * - markFailed(id, patch): Promise<void>
 */
const store = {
  async listDueOutboxEvents(_limit) {
    return [];
  },
  async markProcessing(_id) {
    return true;
  },
  async markDone(_id, _result) {},
  async markFailed(_id, _patch) {},
};

/**
 * @typedef {Object} OutboxEvent
 * @property {string} id
 * @property {string} eventId
 * @property {string} userId
 * @property {string} email
 * @property {string=} name
 * @property {boolean=} subscribed
 * @property {number=} sourceUpdatedAt
 * @property {number} attempts
 */

const fm = new Fluxomail({
  apiKey: process.env.FLUXOMAIL_API_KEY,
  baseUrl: process.env.FLUXOMAIL_BASE_URL,
});

function nextBackoffMs(attempt) {
  const base = Math.min(60_000, 1_000 * Math.pow(2, Math.max(0, attempt - 1)));
  return base + Math.floor(Math.random() * 250);
}

async function processEvent(evt) {
  const idempotencyKey = `user-sync:${evt.eventId}`;
  return fm.contacts.sync({
    source: SOURCE_NAME,
    idempotencyKey,
    idempotentRetry: 5,
    contacts: [
      {
        email: evt.email,
        externalId: evt.userId,
        name: evt.name,
        subscribed: evt.subscribed,
        sourceUpdatedAt: evt.sourceUpdatedAt,
        eventId: evt.eventId,
      },
    ],
  });
}

async function drainOnce() {
  const due = await store.listDueOutboxEvents(MAX_BATCH);
  if (!Array.isArray(due) || due.length === 0) return { processed: 0 };

  let processed = 0;
  for (const evt of due) {
    const locked = await store.markProcessing(evt.id);
    if (!locked) continue;

    try {
      const result = await processEvent(evt);
      await store.markDone(evt.id, {
        processed: result.processed,
        created: result.created,
        updated: result.updated,
        skippedDuplicate: result.skippedDuplicate,
        syncedAt: result.syncedAt || Date.now(),
      });
      processed += 1;
    } catch (error) {
      const attempts = evt.attempts + 1;
      const terminal = attempts >= MAX_ATTEMPTS;
      await store.markFailed(evt.id, {
        attempts,
        nextAttemptAt: terminal ? null : Date.now() + nextBackoffMs(attempts),
        status: terminal ? 'dead_letter' : 'pending',
        lastError: error instanceof Error ? error.message.slice(0, 500) : 'sync_failed',
      });
    }
  }

  return { processed };
}

async function main() {
  const out = await drainOnce();
  if (out.processed > 0) {
    // eslint-disable-next-line no-console
    console.log('[user-sync] processed', out.processed);
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[user-sync] fatal', error);
  process.exit(1);
});

