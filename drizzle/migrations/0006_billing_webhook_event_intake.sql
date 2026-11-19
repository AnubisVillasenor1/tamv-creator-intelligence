-- Minimal idempotency ledger for verified payment-provider webhook intake.
-- This table records receipt only; it does not assert that a subscription was activated.
CREATE TABLE IF NOT EXISTS public.tamv_billing_webhook_events (
  provider text NOT NULL CHECK (provider IN ('stripe')),
  event_id text NOT NULL CHECK (length(event_id) BETWEEN 8 AND 128),
  event_type text NOT NULL CHECK (length(event_type) BETWEEN 1 AND 160),
  payload_sha256 char(64) NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  processing_status text NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'failed')),
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  PRIMARY KEY (provider, event_id),
  CHECK ((processing_status = 'processed') = (processed_at IS NOT NULL))
);

ALTER TABLE public.tamv_billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tamv_billing_webhook_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.tamv_billing_webhook_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.tamv_billing_webhook_events TO service_role;

COMMENT ON TABLE public.tamv_billing_webhook_events IS
  'Idempotent intake ledger for cryptographically verified payment webhooks; receipt is not proof of a completed billing action.';
