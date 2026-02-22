# MongoDB User Sync Template

This template uses a MongoDB collection as outbox and a worker that drains due events into Fluxomail contacts.

## Files

- `worker.mjs`: claim/process/retry worker.

## Env

- `MONGODB_URI`
- `MONGODB_DB` (optional, default `app`)
- `MONGODB_OUTBOX_COLLECTION` (optional, default `fluxomail_user_sync_outbox`)
- `FLUXOMAIL_API_KEY`
- `FLUXOMAIL_BASE_URL` (optional)
- `USER_SYNC_SOURCE` (optional, default `mongodb`)
- `USER_SYNC_BATCH_SIZE` (optional, default `100`)
- `USER_SYNC_MAX_ATTEMPTS` (optional, default `10`)

