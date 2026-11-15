-- Provision through the approved Lovable database/schema workflow.
-- Do not apply manually as a Supabase migration in this repository.
-- The server-only service-role adapter expects this table and unique idempotency key.

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
  constraint tamv_governance_idempotency_matches check (receipt ->> 'idempotencyKey' = idempotency_key)
);

alter table public.tamv_governance_receipts enable row level security;

-- No anon/authenticated policies are intentionally defined.
-- Only the trusted server-side service-role adapter may read/write this ledger.
-- Production approval must verify privileges, backups, retention, and audit access.
