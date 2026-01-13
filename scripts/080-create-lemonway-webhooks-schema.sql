-- Lemonway Webhook Deliveries Schema
-- Independent module for handling incoming webhooks from Lemonway

-- Create schema for lemonway webhooks
CREATE SCHEMA IF NOT EXISTS lemonway_webhooks;

-- Enum for processing status
CREATE TYPE lemonway_webhooks.processing_status AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- Enum for event types (internal aliases)
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

-- Main webhook deliveries table
CREATE TABLE lemonway_webhooks."WebhookDelivery" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "notif_category" INTEGER NOT NULL,
  "event_type" lemonway_webhooks.event_type NOT NULL DEFAULT 'UNKNOWN',
  "wallet_ext_id" VARCHAR(255),
  "wallet_int_id" VARCHAR(255),
  "transaction_id" VARCHAR(255),
  "amount" DECIMAL(18, 2),
  "status_code" INTEGER,
  "raw_headers" JSONB NOT NULL DEFAULT '{}',
  "raw_payload" JSONB NOT NULL DEFAULT '{}',
  "processing_status" lemonway_webhooks.processing_status NOT NULL DEFAULT 'RECEIVED',
  "received_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "processed_at" TIMESTAMP WITH TIME ZONE,
  "error_message" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_webhook_delivery_notif_category ON lemonway_webhooks."WebhookDelivery"("notif_category");
CREATE INDEX idx_webhook_delivery_event_type ON lemonway_webhooks."WebhookDelivery"("event_type");
CREATE INDEX idx_webhook_delivery_wallet_ext_id ON lemonway_webhooks."WebhookDelivery"("wallet_ext_id");
CREATE INDEX idx_webhook_delivery_wallet_int_id ON lemonway_webhooks."WebhookDelivery"("wallet_int_id");
CREATE INDEX idx_webhook_delivery_transaction_id ON lemonway_webhooks."WebhookDelivery"("transaction_id");
CREATE INDEX idx_webhook_delivery_processing_status ON lemonway_webhooks."WebhookDelivery"("processing_status");
CREATE INDEX idx_webhook_delivery_received_at ON lemonway_webhooks."WebhookDelivery"("received_at" DESC);
CREATE INDEX idx_webhook_delivery_status_received ON lemonway_webhooks."WebhookDelivery"("processing_status", "received_at" DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION lemonway_webhooks.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webhook_delivery_updated_at
  BEFORE UPDATE ON lemonway_webhooks."WebhookDelivery"
  FOR EACH ROW
  EXECUTE FUNCTION lemonway_webhooks.update_updated_at_column();

-- Mapping table for NotifCategory to event_type
CREATE TABLE lemonway_webhooks."NotifCategoryMapping" (
  "notif_category" INTEGER PRIMARY KEY,
  "event_type" lemonway_webhooks.event_type NOT NULL,
  "description" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert known mappings based on Lemonway documentation
INSERT INTO lemonway_webhooks."NotifCategoryMapping" ("notif_category", "event_type", "description") VALUES
  (8, 'WALLET_STATUS_CHANGE', 'Wallet Status Change'),
  (9, 'DOCUMENT_STATUS_CHANGE', 'Document Status Change'),
  (10, 'MONEY_IN_WIRE', 'MoneyIn by Wire received'),
  (11, 'MONEY_IN_SDD', 'MoneyIn by SDD received'),
  (12, 'MONEY_IN_CHEQUE', 'MoneyIn by Cheque received'),
  (13, 'BLOCKED_ACCOUNT_STATUS_CHANGE', 'Blocked Account Status Change'),
  (14, 'CHARGEBACK', 'Chargeback'),
  (15, 'MONEY_OUT_CANCELLED', 'Money-Out cancelled'),
  (17, 'MONEY_IN_SDD_CANCELED', 'MoneyIn by SDD canceled'),
  (22, 'MONEY_IN_CARD_SUBSCRIPTION', 'MoneyIn by Card received (Subscription)'),
  (45, 'MONEY_IN_CHEQUE_CANCELED', 'Cheque transaction canceled'),
  (48, 'MONEY_IN_SOFORT', 'MoneyIn by Sofort received')
ON CONFLICT ("notif_category") DO NOTHING;

-- Payment method codes reference table
CREATE TABLE lemonway_webhooks."PaymentMethodCode" (
  "code" INTEGER PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO lemonway_webhooks."PaymentMethodCode" ("code", "name", "description") VALUES
  (0, 'Card', 'Card payment'),
  (1, 'Wire', 'Incoming bank transfer (Money-In)'),
  (3, 'BankTransfer', 'Outgoing bank transfer (Money-Out)'),
  (4, 'Internal', 'Internal transfer (P2P)'),
  (14, 'DirectDebit', 'Direct Debit'),
  (15, 'Cheque', 'Cheque payment'),
  (18, 'PFSCard', 'PFS Physical Card'),
  (19, 'Multibanco', 'Multibanco payment'),
  (30, 'BNPL', 'Buy Now Pay Later'),
  (35, 'PayPal', 'PayPal payment')
ON CONFLICT ("code") DO NOTHING;

-- Blocking reason codes reference table
CREATE TABLE lemonway_webhooks."BlockingReasonCode" (
  "reason_id" INTEGER PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Common Lemonway blocking reasons (add more as needed)
INSERT INTO lemonway_webhooks."BlockingReasonCode" ("reason_id", "name", "description") VALUES
  (1, 'KYC_PENDING', 'KYC verification pending'),
  (2, 'KYC_REJECTED', 'KYC verification rejected'),
  (3, 'FRAUD_SUSPICION', 'Fraud suspicion'),
  (4, 'AML_CHECK', 'AML check required'),
  (5, 'COMPLIANCE_REVIEW', 'Compliance review'),
  (6, 'DOCUMENT_EXPIRED', 'Document expired'),
  (7, 'ACCOUNT_DORMANT', 'Account dormant'),
  (8, 'MANUAL_BLOCK', 'Manual block by admin'),
  (9, 'LEGAL_REQUEST', 'Legal request'),
  (10, 'SANCTIONS_HIT', 'Sanctions list hit')
ON CONFLICT ("reason_id") DO NOTHING;

-- Stats view for dashboard
CREATE OR REPLACE VIEW lemonway_webhooks."WebhookStats" AS
SELECT
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE "processing_status" = 'RECEIVED') as pending_count,
  COUNT(*) FILTER (WHERE "processing_status" = 'PROCESSING') as processing_count,
  COUNT(*) FILTER (WHERE "processing_status" = 'PROCESSED') as processed_count,
  COUNT(*) FILTER (WHERE "processing_status" = 'FAILED') as failed_count,
  COUNT(*) FILTER (WHERE "received_at" >= NOW() - INTERVAL '24 hours') as last_24h_count,
  COUNT(*) FILTER (WHERE "processing_status" = 'FAILED' AND "received_at" >= NOW() - INTERVAL '24 hours') as failed_24h_count
FROM lemonway_webhooks."WebhookDelivery";

COMMENT ON TABLE lemonway_webhooks."WebhookDelivery" IS 'Stores all incoming webhook deliveries from Lemonway';
COMMENT ON TABLE lemonway_webhooks."NotifCategoryMapping" IS 'Maps Lemonway NotifCategory codes to internal event types';
COMMENT ON TABLE lemonway_webhooks."PaymentMethodCode" IS 'Reference table for Lemonway payment method codes';
COMMENT ON TABLE lemonway_webhooks."BlockingReasonCode" IS 'Reference table for Lemonway account blocking reason codes';
