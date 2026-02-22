create table if not exists public.fluxomail_user_sync_outbox (
  id bigint generated always as identity primary key,
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
  on public.fluxomail_user_sync_outbox (status, next_attempt_at);

create or replace function public.claim_fluxomail_user_sync_events(p_limit int, p_lease_seconds int)
returns setof public.fluxomail_user_sync_outbox
language sql
security definer
as $$
  with picked as (
    select id
    from public.fluxomail_user_sync_outbox
    where status = 'pending'
      and next_attempt_at <= now()
    order by next_attempt_at asc
    limit greatest(1, p_limit)
    for update skip locked
  )
  update public.fluxomail_user_sync_outbox o
  set status = 'processing',
      processing_lease_until = now() + make_interval(secs => greatest(1, p_lease_seconds)),
      updated_at = now()
  from picked
  where o.id = picked.id
  returning o.*;
$$;

