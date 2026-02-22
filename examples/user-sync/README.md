# User Sync Templates

Use these templates to keep Fluxomail contacts synchronized with your application users.

## What you get

- `node-outbox-worker.mjs`: generic outbox worker template for any Node backend.
- `convex/`: Convex-native template (outbox schema + enqueue + drain action + cron).
- `postgres/`: SQL outbox schema + worker using `pg`.
- `mongodb/`: MongoDB outbox worker using `mongodb`.
- `supabase/`: Supabase SQL schema + claim RPC + worker.
- `prisma/`: Prisma model + worker using `@prisma/client`.

## Reliability model

- At-least-once delivery from your app to Fluxomail.
- Idempotent writes using per-event idempotency keys (and per-row `eventId`).
- Retries with exponential backoff on transient failures.

## Environment

- `FLUXOMAIL_API_KEY` (required)
- `FLUXOMAIL_BASE_URL` (optional; defaults to public API)

## Recommended flow

1. Write user-created/user-updated events to an outbox table in the same transaction as your user write.
2. Run a background worker (or Convex action+cron) that drains the outbox.
3. Call `contacts.sync` with:
   - `idempotencyKey: "user-sync:<eventId>"`
   - `idempotentRetry` >= 3
   - a single contact row or small batch
4. Mark outbox events `done` only after successful sync response.
5. Keep a periodic reconciliation/backfill job as a safety net.

## Contact payload mapping (minimum)

- `email` -> required
- `externalId` -> your user id
- `name` -> display name
- `subscribed` -> marketing consent
- `sourceUpdatedAt` -> source updated timestamp
- `eventId` -> unique source event id
