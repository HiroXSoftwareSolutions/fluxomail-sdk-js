import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Merge into your Convex schema:
 *   fluxomailUserSyncOutbox: fluxomailUserSyncOutboxTable
 */
export const fluxomailUserSyncOutboxTable = defineTable({
  eventId: v.string(), // unique source event id
  userId: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  subscribed: v.optional(v.boolean()),
  sourceUpdatedAt: v.optional(v.number()),
  deleted: v.optional(v.boolean()),
  status: v.union(
    v.literal('pending'),
    v.literal('processing'),
    v.literal('done'),
    v.literal('dead_letter'),
  ),
  attempts: v.number(),
  nextAttemptAt: v.number(),
  lastError: v.optional(v.string()),
  processingLeaseUntil: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_event_id', ['eventId'])
  .index('by_status_next_attempt', ['status', 'nextAttemptAt']);

