import { v } from 'convex/values';
import { action, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { Fluxomail } from '@fluxomail/sdk';
import type { Id } from './_generated/dataModel';

const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 200;
const MAX_ATTEMPTS = 10;
const PROCESSING_LEASE_MS = 30_000;

function nextBackoffMs(attempt: number): number {
  const base = Math.min(60_000, 1_000 * Math.pow(2, Math.max(0, attempt - 1)));
  return base + Math.floor(Math.random() * 250);
}

export const enqueueUserChanged = internalMutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    subscribed: v.optional(v.boolean()),
    sourceUpdatedAt: v.optional(v.number()),
    deleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<Id<'fluxomailUserSyncOutbox'>> => {
    const existing = await ctx.db
      .query('fluxomailUserSyncOutbox')
      .withIndex('by_event_id', (q) => q.eq('eventId', args.eventId))
      .first();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert('fluxomailUserSyncOutbox', {
      eventId: args.eventId,
      userId: args.userId,
      email: args.email.toLowerCase(),
      name: args.name,
      subscribed: args.subscribed,
      sourceUpdatedAt: args.sourceUpdatedAt,
      deleted: args.deleted,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const listDue = internalQuery({
  args: {
    nowMs: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(MAX_BATCH_SIZE, Math.max(1, args.limit ?? DEFAULT_BATCH_SIZE));
    const rows = await ctx.db
      .query('fluxomailUserSyncOutbox')
      .withIndex('by_status_next_attempt', (q) => q.eq('status', 'pending').lte('nextAttemptAt', args.nowMs))
      .take(limit);
    return rows;
  },
});

export const reserveForProcessing = internalMutation({
  args: {
    outboxId: v.id('fluxomailUserSyncOutbox'),
    nowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.outboxId);
    if (!row) return null;
    if (row.status !== 'pending') return null;
    if (row.nextAttemptAt > args.nowMs) return null;

    await ctx.db.patch(args.outboxId, {
      status: 'processing',
      processingLeaseUntil: args.nowMs + PROCESSING_LEASE_MS,
      updatedAt: args.nowMs,
    });

    return row;
  },
});

export const markDone = internalMutation({
  args: {
    outboxId: v.id('fluxomailUserSyncOutbox'),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.outboxId, {
      status: 'done',
      processingLeaseUntil: undefined,
      lastError: undefined,
      updatedAt: now,
    });
  },
});

export const markRetryableFailure = internalMutation({
  args: {
    outboxId: v.id('fluxomailUserSyncOutbox'),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.outboxId);
    if (!row) return;

    const now = Date.now();
    const attempts = row.attempts + 1;
    const terminal = attempts >= MAX_ATTEMPTS;
    await ctx.db.patch(args.outboxId, {
      attempts,
      status: terminal ? 'dead_letter' : 'pending',
      processingLeaseUntil: undefined,
      nextAttemptAt: terminal ? now : now + nextBackoffMs(attempts),
      lastError: args.error.slice(0, 500),
      updatedAt: now,
    });
  },
});

export const releaseExpiredLeases = internalMutation({
  args: {
    nowMs: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cap = Math.min(MAX_BATCH_SIZE, Math.max(1, args.limit ?? DEFAULT_BATCH_SIZE));
    const processingRows = await ctx.db
      .query('fluxomailUserSyncOutbox')
      .withIndex('by_status_next_attempt', (q) => q.eq('status', 'processing'))
      .take(cap);

    let released = 0;
    for (const row of processingRows) {
      const leaseUntil = row.processingLeaseUntil ?? 0;
      if (leaseUntil > args.nowMs) continue;
      await ctx.db.patch(row._id, {
        status: 'pending',
        processingLeaseUntil: undefined,
        nextAttemptAt: args.nowMs,
        updatedAt: args.nowMs,
      });
      released += 1;
    }
    return { released };
  },
});

export const drainOutbox = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.FLUXOMAIL_API_KEY;
    if (!apiKey) {
      throw new Error('Missing FLUXOMAIL_API_KEY');
    }

    const now = Date.now();
    await ctx.runMutation(internal.fluxomailUserSync.releaseExpiredLeases, { nowMs: now, limit: args.limit });
    const due = await ctx.runQuery(internal.fluxomailUserSync.listDue, { nowMs: now, limit: args.limit });
    if (due.length === 0) return { ok: true as const, processed: 0 };

    const fm = new Fluxomail({
      apiKey,
      baseUrl: process.env.FLUXOMAIL_BASE_URL,
    });
    const source = process.env.USER_SYNC_SOURCE || 'convex';

    let processed = 0;
    for (const row of due) {
      const reserved = await ctx.runMutation(internal.fluxomailUserSync.reserveForProcessing, {
        outboxId: row._id,
        nowMs: Date.now(),
      });
      if (!reserved) continue;

      try {
        await fm.contacts.sync({
          source,
          idempotencyKey: `user-sync:${reserved.eventId}`,
          idempotentRetry: 5,
          contacts: [
            {
              email: reserved.email,
              externalId: reserved.userId,
              name: reserved.name,
              subscribed: reserved.deleted ? false : reserved.subscribed,
              sourceUpdatedAt: reserved.sourceUpdatedAt,
              eventId: reserved.eventId,
              deleted: reserved.deleted,
            },
          ],
        });
        await ctx.runMutation(internal.fluxomailUserSync.markDone, { outboxId: reserved._id });
        processed += 1;
      } catch (error: unknown) {
        await ctx.runMutation(internal.fluxomailUserSync.markRetryableFailure, {
          outboxId: reserved._id,
          error: error instanceof Error ? error.message : 'sync_failed',
        });
      }
    }

    return { ok: true as const, processed };
  },
});

