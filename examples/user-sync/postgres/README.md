# Postgres User Sync Template

This template uses a PostgreSQL outbox table and a worker that drains due events into Fluxomail contacts.

## Files

- `schema.sql`: outbox table + indexes.
- `worker.mjs`: claim/process/retry worker.

## Env

- `DATABASE_URL`
- `FLUXOMAIL_API_KEY`
- `FLUXOMAIL_BASE_URL` (optional)
- `USER_SYNC_SOURCE` (optional, default `postgres`)
- `USER_SYNC_BATCH_SIZE` (optional, default `100`)
- `USER_SYNC_MAX_ATTEMPTS` (optional, default `10`)

