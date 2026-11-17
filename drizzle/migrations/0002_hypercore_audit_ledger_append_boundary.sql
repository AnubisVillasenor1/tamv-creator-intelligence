-- Harden the append-only ledger after the initial schema migration.
-- Application roles must append through the serialized SECURITY DEFINER boundary.
CREATE OR REPLACE FUNCTION public.tamv_hypercore_audit_chain_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  last_hash text;
  payload jsonb;
BEGIN
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
  NEW.event_hash := encode(extensions.digest(convert_to(payload::text, 'UTF8'), 'sha256'), 'hex');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.tamv_hypercore_audit_append(
  p_trace_id text,
  p_occurred_at timestamptz,
  p_core text,
  p_event_name text,
  p_phase text,
  p_lane text,
  p_input_hash char(64),
  p_details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Acquire the chain lock before INSERT allocates its identity sequence value.
  PERFORM pg_advisory_xact_lock(hashtext('tamv_hypercore_audit_events_chain'));
  INSERT INTO public.tamv_hypercore_audit_events
    (trace_id, occurred_at, core, event_name, phase, lane, input_hash, details)
  VALUES
    (p_trace_id, p_occurred_at, p_core, p_event_name, p_phase, p_lane, p_input_hash, COALESCE(p_details, '{}'::jsonb));
END;
$$;
--> statement-breakpoint
REVOKE INSERT ON TABLE public.tamv_hypercore_audit_events FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.tamv_hypercore_audit_events FROM PUBLIC, anon, authenticated, service_role;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.tamv_hypercore_audit_append(text, timestamptz, text, text, text, text, character, jsonb) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.tamv_hypercore_audit_append(text, timestamptz, text, text, text, text, character, jsonb) TO service_role;
