-- Provision through the approved Lovable database/schema workflow.
-- Do not apply manually as a Supabase migration in this repository.
-- The server-only adapter expects this schema, a unique idempotency key,
-- atomic compare-and-set transitions, and an append-only event ledger.

create table if not exists public.tamv_governance_receipts (
  receipt_id text primary key,
  operation_id text not null,
  idempotency_key text not null unique,
  status text not null check (status in ('pending','running','succeeded','failed','blocked','recovery_required')),
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tamv_governance_receipt_id_matches check (receipt ->> 'receiptId' = receipt_id),
  constraint tamv_governance_operation_id_matches check (receipt ->> 'operationId' = operation_id),
  constraint tamv_governance_status_matches check (receipt ->> 'status' = status),
  constraint tamv_governance_idempotency_matches check (receipt ->> 'idempotencyKey' = idempotency_key),
  constraint tamv_governance_evidence_array check (jsonb_typeof(receipt -> 'evidence') = 'array'),
  constraint tamv_governance_success_has_evidence check (
    status <> 'succeeded' or jsonb_array_length(receipt -> 'evidence') > 0
  )
);

create table if not exists public.tamv_governance_receipt_events (
  event_id uuid primary key default gen_random_uuid(),
  receipt_id text not null,
  operation_id text not null,
  event_type text not null check (event_type in ('intent_created','status_transition')),
  previous_status text,
  status text not null check (status in ('pending','running','succeeded','failed','blocked','recovery_required')),
  receipt jsonb not null,
  occurred_at timestamptz not null default now()
);

create index if not exists tamv_governance_receipt_events_lookup
  on public.tamv_governance_receipt_events (receipt_id, occurred_at, event_id);

alter table public.tamv_governance_receipts enable row level security;
alter table public.tamv_governance_receipt_events enable row level security;

-- No anon/authenticated policies are intentionally defined.
-- The current-state projection is writable only by the trusted server adapter.
grant select, insert, update on public.tamv_governance_receipts to service_role;
grant select on public.tamv_governance_receipt_events to service_role;
revoke insert, update, delete, truncate on public.tamv_governance_receipt_events from anon, authenticated, service_role;

create or replace function public.tamv_guard_governance_receipt_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.receipt_id <> old.receipt_id
    or new.operation_id <> old.operation_id
    or new.idempotency_key <> old.idempotency_key
    or new.receipt ->> 'actorRef' <> old.receipt ->> 'actorRef'
    or new.receipt ->> 'targetRef' <> old.receipt ->> 'targetRef'
    or new.receipt ->> 'sourceCommitSha' <> old.receipt ->> 'sourceCommitSha'
    or new.receipt ->> 'artifactSha256' <> old.receipt ->> 'artifactSha256'
    or new.receipt ->> 'policyVersion' <> old.receipt ->> 'policyVersion'
    or new.receipt ->> 'startedAt' <> old.receipt ->> 'startedAt'
  then
    raise exception 'immutable governance operation binding changed' using errcode = '23514';
  end if;

  if not (
    (old.status = 'pending' and new.status in ('running','blocked','failed'))
    or (old.status = 'running' and new.status in ('succeeded','failed','blocked','recovery_required'))
    or (old.status = 'blocked' and new.status in ('running','failed'))
    or (old.status = 'recovery_required' and new.status in ('running','failed','blocked'))
  ) then
    raise exception 'invalid governance operation status transition' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.tamv_append_governance_receipt_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.tamv_governance_receipt_events (
    receipt_id, operation_id, event_type, previous_status, status, receipt
  ) values (
    new.receipt_id,
    new.operation_id,
    case when tg_op = 'INSERT' then 'intent_created' else 'status_transition' end,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    new.receipt
  );
  return new;
end;
$$;

drop trigger if exists tamv_governance_receipt_guard on public.tamv_governance_receipts;
create trigger tamv_governance_receipt_guard
before update on public.tamv_governance_receipts
for each row execute function public.tamv_guard_governance_receipt_update();

drop trigger if exists tamv_governance_receipt_event on public.tamv_governance_receipts;
create trigger tamv_governance_receipt_event
after insert or update on public.tamv_governance_receipts
for each row execute function public.tamv_append_governance_receipt_event();

-- Operational notes:
-- 1. The row update and event insert share one PostgreSQL transaction.
-- 2. Only the service role can mutate the current-state projection; event rows
--    are append-only for application roles.
-- 3. A trusted application-level evidence verifier is still required before
--    moving an operation to succeeded. SQL checks non-empty evidence only.
-- 4. Validate grants, trigger ownership, backup/restore, RLS, and concurrent
--    compare-and-set behavior in a non-production Supabase project first.
