import { v } from 'convex/values';
import { mutation } from './_generated/server';
import { internal } from './_generated/api';

/**
 * Example mutation showing how to enqueue sync after a user write.
 * Keep the enqueue call inside the same mutation for transactional safety.
 */
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    subscribed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      email: args.email.toLowerCase(),
      name: args.name,
      subscribed: args.subscribed ?? true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.runMutation(internal.fluxomailUserSync.enqueueUserChanged, {
      eventId: `user-created:${userId}:${now}`,
      userId: String(userId),
      email: args.email,
      name: args.name,
      subscribed: args.subscribed ?? true,
      sourceUpdatedAt: now,
      deleted: false,
    });

    return userId;
  },
});

