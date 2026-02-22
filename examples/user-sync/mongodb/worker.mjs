import { MongoClient } from 'mongodb';
import { Fluxomail } from '../../../dist/index.js';

const SOURCE = process.env.USER_SYNC_SOURCE || 'mongodb';
const BATCH_SIZE = Number(process.env.USER_SYNC_BATCH_SIZE || 100);
const MAX_ATTEMPTS = Number(process.env.USER_SYNC_MAX_ATTEMPTS || 10);
const LEASE_MS = 30_000;

const client = new MongoClient(process.env.MONGODB_URI);
const fm = new Fluxomail({
  apiKey: process.env.FLUXOMAIL_API_KEY,
  baseUrl: process.env.FLUXOMAIL_BASE_URL,
});

function nextBackoffMs(attempt) {
  const base = Math.min(60_000, 1_000 * Math.pow(2, Math.max(0, attempt - 1)));
  return base + Math.floor(Math.random() * 250);
}

async function setupIndexes(col) {
  await col.createIndex({ eventId: 1 }, { unique: true });
  await col.createIndex({ status: 1, nextAttemptAt: 1 });
}

async function releaseExpiredLeases(col, now) {
  await col.updateMany(
    {
      status: 'processing',
      processingLeaseUntil: { $lte: now },
    },
    {
      $set: {
        status: 'pending',
        nextAttemptAt: now,
        updatedAt: now,
      },
      $unset: { processingLeaseUntil: '' },
    },
  );
}

async function claimOne(col, now) {
  const res = await col.findOneAndUpdate(
    {
      status: 'pending',
      nextAttemptAt: { $lte: now },
    },
    {
      $set: {
        status: 'processing',
        processingLeaseUntil: new Date(now.getTime() + LEASE_MS),
        updatedAt: now,
      },
    },
    {
      sort: { nextAttemptAt: 1 },
      returnDocument: 'after',
    },
  );
  return res.value;
}

async function markDone(col, rowId, now) {
  await col.updateOne(
    { _id: rowId },
    {
      $set: {
        status: 'done',
        syncedAt: now,
        updatedAt: now,
      },
      $unset: { processingLeaseUntil: '', lastError: '' },
    },
  );
}

async function markFailure(col, row, errorMessage, now) {
  const attempts = Number(row.attempts || 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await col.updateOne(
      { _id: row._id },
      {
        $set: {
          status: 'dead_letter',
          attempts,
          lastError: String(errorMessage).slice(0, 500),
          updatedAt: now,
        },
        $unset: { processingLeaseUntil: '' },
      },
    );
    return;
  }

  await col.updateOne(
    { _id: row._id },
    {
      $set: {
        status: 'pending',
        attempts,
        nextAttemptAt: new Date(now.getTime() + nextBackoffMs(attempts)),
        lastError: String(errorMessage).slice(0, 500),
        updatedAt: now,
      },
      $unset: { processingLeaseUntil: '' },
    },
  );
}

async function syncRow(row) {
  await fm.contacts.sync({
    source: SOURCE,
    idempotencyKey: `user-sync:${row.eventId}`,
    idempotentRetry: 5,
    contacts: [
      {
        email: row.email,
        externalId: row.userId,
        name: row.name,
        subscribed: row.deleted ? false : row.subscribed,
        sourceUpdatedAt: row.sourceUpdatedAt,
        eventId: row.eventId,
        deleted: !!row.deleted,
      },
    ],
  });
}

async function main() {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || 'app');
  const col = db.collection(process.env.MONGODB_OUTBOX_COLLECTION || 'fluxomail_user_sync_outbox');
  await setupIndexes(col);

  const now = new Date();
  await releaseExpiredLeases(col, now);

  let processed = 0;
  for (let i = 0; i < BATCH_SIZE; i++) {
    const row = await claimOne(col, new Date());
    if (!row) break;

    try {
      await syncRow(row);
      await markDone(col, row._id, new Date());
      processed += 1;
    } catch (error) {
      await markFailure(col, row, error instanceof Error ? error.message : 'sync_failed', new Date());
    }
  }

  await client.close();
  if (processed > 0) {
    console.log('[user-sync:mongodb] processed', processed);
  }
}

main().catch(async (error) => {
  try {
    await client.close();
  } catch {}
  console.error('[user-sync:mongodb] fatal', error);
  process.exit(1);
});

