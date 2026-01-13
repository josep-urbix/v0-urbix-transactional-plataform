-- Create lemonway_webhooks schema if not exists
CREATE SCHEMA IF NOT EXISTS lemonway_webhooks;

-- Create event_type enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'event_type' AND n.nspname = 'lemonway_webhooks') THEN
    CREATE TYPE lemonway_webhooks.event_type AS ENUM (
      'BLOCKED_ACCOUNT_STATUS_CHANGE',
      'WALLET_STATUS_CHANGE',
      'MONEY_IN_WIRE',
      'MONEY_IN_SDD',
      'MONEY_IN_CHEQUE',
      'MONEY_IN_CARD_SUBSCRIPTION',
      'MONEY_IN_SOFORT',
      'MONEY_IN_CHARGEBACK',
      'MONEY_IN_CHEQUE_CANCELED',
      'MONEY_IN_SDD_CANCELED',
      'MONEY_OUT_STATUS',
      'MONEY_OUT_CANCELLED',
      'DOCUMENT_STATUS_CHANGE',
      'CHARGEBACK',
      'UNKNOWN'
    );
  END IF;
END $$;

-- Create processing_status enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE t.typname = 'processing_status' AND n.nspname = 'lemonway_webhooks') THEN
    CREATE TYPE lemonway_webhooks.processing_status AS ENUM (
      'RECEIVED',
      'PROCESSING', 
      'PROCESSED',
      'FAILED'
    );
  END IF;
END $$;

-- Create WebhookDelivery table if not exists
CREATE TABLE IF NOT EXISTS lemonway_webhooks."WebhookDelivery" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notif_category INTEGER NOT NULL,
  event_type lemonway_webhooks.event_type NOT NULL DEFAULT 'UNKNOWN',
  wallet_ext_id TEXT,
  wallet_int_id TEXT,
  transaction_id TEXT,
  amount NUMERIC(15,2),
  status_code INTEGER,
  raw_headers JSONB NOT NULL DEFAULT '{}',
  raw_payload JSONB NOT NULL DEFAULT '{}',
  processing_status lemonway_webhooks.processing_status NOT NULL DEFAULT 'RECEIVED',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_notif_category ON lemonway_webhooks."WebhookDelivery" (notif_category);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_event_type ON lemonway_webhooks."WebhookDelivery" (event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_processing_status ON lemonway_webhooks."WebhookDelivery" (processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_wallet_ext_id ON lemonway_webhooks."WebhookDelivery" (wallet_ext_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_received_at ON lemonway_webhooks."WebhookDelivery" (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_created_at ON lemonway_webhooks."WebhookDelivery" (created_at DESC);

-- Grant permissions
GRANT ALL ON SCHEMA lemonway_webhooks TO PUBLIC;
GRANT ALL ON ALL TABLES IN SCHEMA lemonway_webhooks TO PUBLIC;
