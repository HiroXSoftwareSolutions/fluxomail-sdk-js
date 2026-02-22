# Prisma User Sync Template

This template uses Prisma + a SQL database outbox model for reliable user sync.

## Files

- `schema.prisma`: outbox model snippet.
- `worker.mjs`: worker using PrismaClient to drain and sync.

## Env

- `DATABASE_URL`
- `FLUXOMAIL_API_KEY`
- `FLUXOMAIL_BASE_URL` (optional)
- `USER_SYNC_SOURCE` (optional, default `prisma`)
- `USER_SYNC_BATCH_SIZE` (optional, default `100`)
- `USER_SYNC_MAX_ATTEMPTS` (optional, default `10`)

