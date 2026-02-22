import { Pool } from 'pg';
import { Fluxomail } from '../../../dist/index.js';

const SOURCE = process.env.USER_SYNC_SOURCE || 'postgres';
const BATCH_SIZE = Number(process.env.USER_SYNC_BATCH_SIZE || 100);
const MAX_ATTEMPTS = Number(process.env.USER_SYNC_MAX_ATTEMPTS || 10);
const LEASE_SECONDS = 30;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const fm = new Fluxomail({
  apiKey: process.env.FLUXOMAIL_API_KEY,
  baseUrl: process.env.FLUXOMAIL_BASE_URL,
});

function nextBackoffMs(attempt) {
  const base = Math.min(60_000, 1_000 * Math.pow(2, Math.max(0, attempt - 1)));
  return base + Math.floor(Math.random() * 250);
}

async function releaseExpiredLeases(client) {
  await client.query(
    `update fluxomail_user_sync_outbox
     set status = 'pending',
         processing_lease_until = null,
         updated_at = now()
     where status = 'processing'
       and processing_lease_until is not null
       and processing_lease_until <= now()`,
  );
}

async function claimRows(client, limit) {
  const sql = `
    with picked as (
      select id
      from fluxomail_user_sync_outbox
      where status = 'pending' and next_attempt_at <= now()
      order by next_attempt_at asc
      limit $1
      for update skip locked
    )
    update fluxomail_user_sync_outbox o
    set status = 'processing',
        processing_lease_until = now() + ($2 || ' seconds')::interval,
        updated_at = now()
    from picked
    where o.id = picked.id
    returning o.*;
  `;
  const { rows } = await client.query(sql, [limit, String(LEASE_SECONDS)]);
  return rows;
}

async function markDone(client, id) {
  await client.query(
    `update fluxomail_user_sync_outbox
     set status = 'done',
         processing_lease_until = null,
         synced_at = now(),
         last_error = null,
         updated_at = now()
     where id = $1`,
    [id],
  );
}

async function markFailure(client, row, errorMessage) {
  const attempts = Number(row.attempts || 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await client.query(
      `update fluxomail_user_sync_outbox
       set attempts = $2,
           status = 'dead_letter',
           processing_lease_until = null,
           last_error = $3,
           updated_at = now()
       where id = $1`,
      [row.id, attempts, String(errorMessage).slice(0, 500)],
    );
    return;
  }

  const backoffMs = nextBackoffMs(attempts);
  await client.query(
    `update fluxomail_user_sync_outbox
     set attempts = $2,
         status = 'pending',
         processing_lease_until = null,
         next_attempt_at = now() + ($3 || ' milliseconds')::interval,
         last_error = $4,
         updated_at = now()
     where id = $1`,
    [row.id, attempts, String(backoffMs), String(errorMessage).slice(0, 500)],
  );
}

async function syncRow(row) {
  await fm.contacts.sync({
    source: SOURCE,
    idempotencyKey: `user-sync:${row.event_id}`,
    idempotentRetry: 5,
    contacts: [
      {
        email: row.email,
        externalId: row.user_id,
        name: row.name || undefined,
        subscribed: row.deleted ? false : row.subscribed,
        sourceUpdatedAt: row.source_updated_at || undefined,
        eventId: row.event_id,
        deleted: !!row.deleted,
      },
    ],
  });
}

async function main() {
  const client = await pool.connect();
  let processed = 0;

  try {
    await client.query('begin');
    await releaseExpiredLeases(client);
    const rows = await claimRows(client, BATCH_SIZE);
    await client.query('commit');

    for (const row of rows) {
      try {
        await syncRow(row);
        await markDone(client, row.id);
        processed += 1;
      } catch (error) {
        await markFailure(client, row, error instanceof Error ? error.message : 'sync_failed');
      }
    }
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  if (processed > 0) {
    console.log('[user-sync:postgres] processed', processed);
  }
}

main().catch((error) => {
  console.error('[user-sync:postgres] fatal', error);
  process.exit(1);
});

