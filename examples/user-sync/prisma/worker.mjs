import { PrismaClient } from '@prisma/client';
import { Fluxomail } from '../../../dist/index.js';

const SOURCE = process.env.USER_SYNC_SOURCE || 'prisma';
const BATCH_SIZE = Number(process.env.USER_SYNC_BATCH_SIZE || 100);
const MAX_ATTEMPTS = Number(process.env.USER_SYNC_MAX_ATTEMPTS || 10);
const LEASE_MS = 30_000;

const prisma = new PrismaClient();
const fm = new Fluxomail({
  apiKey: process.env.FLUXOMAIL_API_KEY,
  baseUrl: process.env.FLUXOMAIL_BASE_URL,
});

function nextBackoffMs(attempt) {
  const base = Math.min(60_000, 1_000 * Math.pow(2, Math.max(0, attempt - 1)));
  return base + Math.floor(Math.random() * 250);
}

async function releaseExpiredLeases(now) {
  await prisma.fluxomailUserSyncOutbox.updateMany({
    where: {
      status: 'processing',
      processingLeaseUntil: { lte: now },
    },
    data: {
      status: 'pending',
      nextAttemptAt: now,
      processingLeaseUntil: null,
    },
  });
}

async function findDue(limit) {
  return prisma.fluxomailUserSyncOutbox.findMany({
    where: {
      status: 'pending',
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { nextAttemptAt: 'asc' },
    take: limit,
  });
}

async function reserveRow(rowId, now) {
  const res = await prisma.fluxomailUserSyncOutbox.updateMany({
    where: {
      id: rowId,
      status: 'pending',
      nextAttemptAt: { lte: now },
    },
    data: {
      status: 'processing',
      processingLeaseUntil: new Date(now.getTime() + LEASE_MS),
    },
  });
  return res.count === 1;
}

async function markDone(rowId) {
  await prisma.fluxomailUserSyncOutbox.update({
    where: { id: rowId },
    data: {
      status: 'done',
      processingLeaseUntil: null,
      syncedAt: new Date(),
      lastError: null,
    },
  });
}

async function markFailure(row, message) {
  const attempts = row.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await prisma.fluxomailUserSyncOutbox.update({
      where: { id: row.id },
      data: {
        attempts,
        status: 'dead_letter',
        processingLeaseUntil: null,
        lastError: String(message).slice(0, 500),
      },
    });
    return;
  }

  await prisma.fluxomailUserSyncOutbox.update({
    where: { id: row.id },
    data: {
      attempts,
      status: 'pending',
      processingLeaseUntil: null,
      nextAttemptAt: new Date(Date.now() + nextBackoffMs(attempts)),
      lastError: String(message).slice(0, 500),
    },
  });
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
        name: row.name || undefined,
        subscribed: row.deleted ? false : row.subscribed ?? undefined,
        sourceUpdatedAt: row.sourceUpdatedAt ? Number(row.sourceUpdatedAt) : undefined,
        eventId: row.eventId,
        deleted: !!row.deleted,
      },
    ],
  });
}

async function main() {
  const now = new Date();
  await releaseExpiredLeases(now);
  const due = await findDue(BATCH_SIZE);

  let processed = 0;
  for (const row of due) {
    const reserved = await reserveRow(row.id, new Date());
    if (!reserved) continue;

    try {
      await syncRow(row);
      await markDone(row.id);
      processed += 1;
    } catch (error) {
      await markFailure(row, error instanceof Error ? error.message : 'sync_failed');
    }
  }

  await prisma.$disconnect();
  if (processed > 0) {
    console.log('[user-sync:prisma] processed', processed);
  }
}

main().catch(async (error) => {
  try {
    await prisma.$disconnect();
  } catch {}
  console.error('[user-sync:prisma] fatal', error);
  process.exit(1);
});

