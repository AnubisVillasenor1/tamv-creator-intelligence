CREATE SCHEMA IF NOT EXISTS extensions;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS tamv_hypercore_audit_events (
  sequence_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  trace_id text NOT NULL CHECK (length(trace_id) BETWEEN 1 AND 200),
  occurred_at timestamptz NOT NULL,
  core text NOT NULL CHECK (core IN ('governance', 'execution', 'verification')),
  event_name text NOT NULL CHECK (length(event_name) BETWEEN 1 AND 200),
  phase text NOT NULL CHECK (phase IN ('accepted', 'executing', 'completed', 'failed')),
  lane text CHECK (lane IS NULL OR lane IN ('hot', 'cold')),
  input_hash char(64) NOT NULL CHECK (input_hash ~ '^[a-fA-F0-9]{64}$'),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  previous_hash char(64) NOT NULL,
  event_hash char(64) NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tamv_hypercore_audit_trace_idx
  ON tamv_hypercore_audit_events (trace_id, sequence_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tamv_hypercore_audit_time_idx
  ON tamv_hypercore_audit_events (occurred_at DESC);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION tamv_hypercore_audit_chain_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  last_hash text;
  payload jsonb;
BEGIN
  -- Serialize chain-head updates inside the transaction to avoid forked chains.
  PERFORM pg_advisory_xact_lock(hashtext('tamv_hypercore_audit_events_chain'));
  SELECT event_hash INTO last_hash
    FROM public.tamv_hypercore_audit_events
    ORDER BY sequence_id DESC
    LIMIT 1;
  NEW.previous_hash := COALESCE(last_hash, repeat('0', 64));
  payload := jsonb_build_object(
    'event_id', NEW.event_id,
    'trace_id', NEW.trace_id,
    'occurred_at', NEW.occurred_at,
    'core', NEW.core,
    'event_name', NEW.event_name,
    'phase', NEW.phase,
    'lane', NEW.lane,
    'input_hash', NEW.input_hash,
    'details', NEW.details,
    'previous_hash', NEW.previous_hash
  );
  NEW.event_hash := encode(digest(convert_to(payload::text, 'UTF8'), 'sha256'), 'hex');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS tamv_hypercore_audit_chain_before_insert ON tamv_hypercore_audit_events;
--> statement-breakpoint
CREATE TRIGGER tamv_hypercore_audit_chain_before_insert
BEFORE INSERT ON tamv_hypercore_audit_events
FOR EACH ROW EXECUTE FUNCTION tamv_hypercore_audit_chain_insert();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION tamv_hypercore_audit_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'tamv_hypercore_audit_events is append-only';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS tamv_hypercore_audit_no_update_delete ON tamv_hypercore_audit_events;
--> statement-breakpoint
CREATE TRIGGER tamv_hypercore_audit_no_update_delete
BEFORE UPDATE OR DELETE ON tamv_hypercore_audit_events
FOR EACH ROW EXECUTE FUNCTION tamv_hypercore_audit_reject_mutation();
--> statement-breakpoint
DROP TRIGGER IF EXISTS tamv_hypercore_audit_no_truncate ON tamv_hypercore_audit_events;
--> statement-breakpoint
CREATE TRIGGER tamv_hypercore_audit_no_truncate
BEFORE TRUNCATE ON tamv_hypercore_audit_events
FOR EACH STATEMENT EXECUTE FUNCTION tamv_hypercore_audit_reject_mutation();
--> statement-breakpoint
ALTER TABLE tamv_hypercore_audit_events ENABLE ROW LEVEL SECURITY;
