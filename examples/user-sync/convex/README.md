# Convex User Sync Template

This template shows a robust Convex pattern for syncing new/updated users to Fluxomail contacts.

## Files

- `syncOutbox.schema.ts`: table definition to merge into your Convex schema.
- `fluxomailUserSync.ts`: enqueue mutation + drain action + retry handling.
- `crons.ts`: scheduled drain wiring.

## Setup

1. Add schema from `syncOutbox.schema.ts` into your `convex/schema.ts`.
2. Copy `fluxomailUserSync.ts` into your Convex folder and register exports.
3. Add cron wiring from `crons.ts` (or call the action from your own scheduler).
4. Set env vars in Convex:
   - `FLUXOMAIL_API_KEY`
   - `FLUXOMAIL_BASE_URL` (optional)
   - `USER_SYNC_SOURCE` (optional, default `convex`)

## Usage

- On user create/update/delete in your app:
  - call `internal.fluxomailUserSync.enqueueUserChanged` with a unique `eventId`.
- Cron executes `internal.fluxomailUserSync.drainOutbox` every minute.
- Action sends rows to Fluxomail with idempotency and retry-safe semantics.

## Why this is reliable

- Outbox event is written inside Convex mutation transaction.
- Delivery is at-least-once with retry and backoff.
- Fluxomail write is idempotent via `idempotencyKey` + row `eventId`.

