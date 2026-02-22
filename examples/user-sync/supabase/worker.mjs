import { createClient } from '@supabase/supabase-js';
import { Fluxomail } from '../../../dist/index.js';

const SOURCE = process.env.USER_SYNC_SOURCE || 'supabase';
const BATCH_SIZE = Number(process.env.USER_SYNC_BATCH_SIZE || 100);
const MAX_ATTEMPTS = Number(process.env.USER_SYNC_MAX_ATTEMPTS || 10);
const LEASE_SECONDS = 30;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const fm = new Fluxomail({
  apiKey: process.env.FLUXOMAIL_API_KEY,
  baseUrl: process.env.FLUXOMAIL_BASE_URL,
});

function nextBackoffMs(attempt) {
  const base = Math.min(60_000, 1_000 * Math.pow(2, Math.max(0, attempt - 1)));
  return base + Math.floor(Math.random() * 250);
}

async function releaseExpiredLeases() {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('fluxomail_user_sync_outbox')
    .update({
      status: 'pending',
      next_attempt_at: nowIso,
      processing_lease_until: null,
      updated_at: nowIso,
    })
    .eq('status', 'processing')
    .lte('processing_lease_until', nowIso);
  if (error) throw error;
}

async function claimRows() {
  const { data, error } = await supabase.rpc('claim_fluxomail_user_sync_events', {
    p_limit: BATCH_SIZE,
    p_lease_seconds: LEASE_SECONDS,
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function markDone(rowId) {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('fluxomail_user_sync_outbox')
    .update({
      status: 'done',
      synced_at: nowIso,
      processing_lease_until: null,
      last_error: null,
      updated_at: nowIso,
    })
    .eq('id', rowId);
  if (error) throw error;
}

async function markFailure(row, message) {
  const attempts = Number(row.attempts || 0) + 1;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const patch = attempts >= MAX_ATTEMPTS
    ? {
        status: 'dead_letter',
        attempts,
        processing_lease_until: null,
        last_error: String(message).slice(0, 500),
        updated_at: nowIso,
      }
    : {
        status: 'pending',
        attempts,
        processing_lease_until: null,
        next_attempt_at: new Date(now + nextBackoffMs(attempts)).toISOString(),
        last_error: String(message).slice(0, 500),
        updated_at: nowIso,
      };

  const { error } = await supabase
    .from('fluxomail_user_sync_outbox')
    .update(patch)
    .eq('id', row.id);
  if (error) throw error;
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
  await releaseExpiredLeases();
  const rows = await claimRows();

  let processed = 0;
  for (const row of rows) {
    try {
      await syncRow(row);
      await markDone(row.id);
      processed += 1;
    } catch (error) {
      await markFailure(row, error instanceof Error ? error.message : 'sync_failed');
    }
  }

  if (processed > 0) {
    console.log('[user-sync:supabase] processed', processed);
  }
}

main().catch((error) => {
  console.error('[user-sync:supabase] fatal', error);
  process.exit(1);
});

