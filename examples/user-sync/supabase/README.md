# Supabase User Sync Template

This template uses a Supabase Postgres outbox table and a worker that claims rows via RPC.

## Files

- `schema.sql`: outbox table + indexes + `claim_fluxomail_user_sync_events` RPC.
- `worker.mjs`: claim/process/retry worker using Supabase service role.

## Env

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FLUXOMAIL_API_KEY`
- `FLUXOMAIL_BASE_URL` (optional)
- `USER_SYNC_SOURCE` (optional, default `supabase`)
- `USER_SYNC_BATCH_SIZE` (optional, default `100`)
- `USER_SYNC_MAX_ATTEMPTS` (optional, default `10`)

