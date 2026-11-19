-- Membership source of truth and atomic, idempotent Stripe subscription-event processing.
-- Apply only after 0006_billing_webhook_event_intake.sql.
CREATE TABLE IF NOT EXISTS public.tamv_memberships (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE CHECK (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  stripe_subscription_id text NOT NULL UNIQUE CHECK (stripe_subscription_id ~ '^sub_[A-Za-z0-9]+$'),
  plan_key text NOT NULL CHECK (plan_key ~ '^[a-z][a-z0-9_-]{1,39}$'),
  status text NOT NULL CHECK (status IN ('active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused')),
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  last_event_created bigint NOT NULL CHECK (last_event_created >= 0),
  last_event_id text NOT NULL CHECK (last_event_id ~ '^evt_[A-Za-z0-9]+$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tamv_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamv_memberships FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tamv_memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tamv_memberships TO service_role;

CREATE OR REPLACE FUNCTION public.process_tamv_stripe_billing_event(
  p_event jsonb,
  p_payload_sha256 text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_id text;
  v_type text;
  v_created bigint;
  v_object jsonb;
  v_user_id uuid;
  v_plan_key text;
  v_status text;
  v_customer text;
  v_subscription text;
  v_period_end timestamptz;
  v_cancel boolean;
  v_existing public.tamv_billing_webhook_events%ROWTYPE;
  v_inserted integer;
BEGIN
  IF p_event IS NULL OR jsonb_typeof(p_event) <> 'object'
     OR p_event->>'object' <> 'event'
     OR COALESCE(p_event->>'id','') !~ '^evt_[A-Za-z0-9]+$'
     OR COALESCE(p_event->>'type','') = ''
     OR length(p_event->>'type') > 160
     OR COALESCE(p_event->>'created','') !~ '^[0-9]{1,12}$'
     OR COALESCE(p_payload_sha256,'') !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid Stripe event envelope' USING ERRCODE = '22023';
  END IF;

  v_id := p_event->>'id';
  v_type := p_event->>'type';
  v_created := (p_event->>'created')::bigint;
  v_object := p_event #> '{data,object}';
  IF jsonb_typeof(v_object) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Stripe event data.object is missing' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.tamv_billing_webhook_events
    (provider, event_id, event_type, payload_sha256, processing_status)
  VALUES ('stripe', v_id, v_type, p_payload_sha256, 'received')
  ON CONFLICT (provider, event_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted = 0 THEN
    SELECT * INTO v_existing
      FROM public.tamv_billing_webhook_events
      WHERE provider = 'stripe' AND event_id = v_id
      FOR UPDATE;
    IF v_existing.payload_sha256 <> p_payload_sha256 THEN
      RAISE EXCEPTION 'Stripe event id reused with different payload' USING ERRCODE = '22000';
    END IF;
    IF v_existing.processing_status = 'processed' THEN
      RETURN jsonb_build_object('status','duplicate','eventId',v_id);
    END IF;
  END IF;

  -- Ignore unrelated Stripe event types without changing entitlement state.
  IF v_type NOT LIKE 'customer.subscription.%' THEN
    UPDATE public.tamv_billing_webhook_events
       SET processing_status = 'processed', processed_at = now()
     WHERE provider = 'stripe' AND event_id = v_id;
    RETURN jsonb_build_object('status','ignored','eventId',v_id);
  END IF;

  IF COALESCE(v_object->>'id','') !~ '^sub_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Subscription id is invalid' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(v_object->>'customer','') !~ '^cus_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'Customer id is invalid' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(v_object #>> '{metadata,tamv_user_id}','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Subscription metadata must include tamv_user_id UUID' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(v_object #>> '{metadata,tamv_plan_key}','') !~ '^[a-z][a-z0-9_-]{1,39}$' THEN
    RAISE EXCEPTION 'Subscription metadata must include a valid tamv_plan_key' USING ERRCODE = '22023';
  END IF;

  v_user_id := (v_object #>> '{metadata,tamv_user_id}')::uuid;
  v_plan_key := v_object #>> '{metadata,tamv_plan_key}';
  v_subscription := v_object->>'id';
  v_customer := v_object->>'customer';
  v_status := CASE WHEN v_type = 'customer.subscription.deleted' THEN 'canceled' ELSE v_object->>'status' END;
  IF v_status NOT IN ('active','trialing','past_due','canceled','unpaid','incomplete','incomplete_expired','paused') THEN
    RAISE EXCEPTION 'Unsupported Stripe subscription status' USING ERRCODE = '22023';
  END IF;
  IF COALESCE(v_object->>'current_period_end','') ~ '^[0-9]{1,12}$' THEN
    v_period_end := to_timestamp((v_object->>'current_period_end')::bigint);
  ELSE
    v_period_end := NULL;
  END IF;
  v_cancel := COALESCE((v_object->>'cancel_at_period_end')::boolean, false);

  INSERT INTO public.tamv_memberships
    (user_id, stripe_customer_id, stripe_subscription_id, plan_key, status,
     current_period_end, cancel_at_period_end, last_event_created, last_event_id, updated_at)
  VALUES
    (v_user_id, v_customer, v_subscription, v_plan_key, v_status,
     v_period_end, v_cancel, v_created, v_id, now())
  ON CONFLICT (user_id) DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    plan_key = EXCLUDED.plan_key,
    status = EXCLUDED.status,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    last_event_created = EXCLUDED.last_event_created,
    last_event_id = EXCLUDED.last_event_id,
    updated_at = now()
  WHERE (public.tamv_memberships.last_event_created, public.tamv_memberships.last_event_id)
      <= (EXCLUDED.last_event_created, EXCLUDED.last_event_id);

  UPDATE public.tamv_billing_webhook_events
     SET processing_status = 'processed', processed_at = now()
   WHERE provider = 'stripe' AND event_id = v_id;

  RETURN jsonb_build_object('status','processed','eventId',v_id,'eventType',v_type);
END;
$$;

REVOKE ALL ON FUNCTION public.process_tamv_stripe_billing_event(jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_tamv_stripe_billing_event(jsonb, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_tamv_membership_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*)::integer FROM public.tamv_memberships),
    'by_status', COALESCE((SELECT jsonb_object_agg(status, amount) FROM (
      SELECT status, count(*)::integer AS amount FROM public.tamv_memberships GROUP BY status
    ) AS statuses), '{}'::jsonb),
    'by_plan', COALESCE((SELECT jsonb_object_agg(plan_key, amount) FROM (
      SELECT plan_key, count(*)::integer AS amount FROM public.tamv_memberships GROUP BY plan_key
    ) AS plans), '{}'::jsonb),
    'as_of', now()
  );
$$;

REVOKE ALL ON FUNCTION public.get_tamv_membership_summary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tamv_membership_summary() TO service_role;

COMMENT ON TABLE public.tamv_memberships IS
  'Server-managed Stripe subscription entitlement state. Client roles have no direct access; only verified billing events update this table.';
