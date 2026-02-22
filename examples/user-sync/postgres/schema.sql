create table if not exists fluxomail_user_sync_outbox (
  id bigserial primary key,
  event_id text not null unique,
  user_id text not null,
  email text not null,
  name text,
  subscribed boolean,
  source_updated_at bigint,
  deleted boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'dead_letter')),
  attempts int not null default 0,
  next_attempt_at timestamptz not null default now(),
  processing_lease_until timestamptz,
  last_error text,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fluxo_sync_status_next_attempt
  on fluxomail_user_sync_outbox (status, next_attempt_at);

