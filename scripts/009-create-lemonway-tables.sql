-- Tabla para configuración de API de Lemonway
CREATE TABLE IF NOT EXISTS "LemonwayConfig" (
  "id" SERIAL PRIMARY KEY,
  "environment" VARCHAR(20) NOT NULL DEFAULT 'sandbox', -- sandbox o production
  "api_url" TEXT NOT NULL,
  "api_token" VARCHAR(255) NOT NULL, -- Solo token de acceso, sin login/password
  "wallet_id" VARCHAR(100),
  "webhook_secret" VARCHAR(255),
  "company_name" VARCHAR(255),
  "company_website" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para transacciones de Lemonway
CREATE TABLE IF NOT EXISTS "LemonwayTransaction" (
  "id" SERIAL PRIMARY KEY,
  "transaction_id" VARCHAR(100) UNIQUE NOT NULL, -- ID de Lemonway
  "wallet_id" VARCHAR(100) NOT NULL,
  "type" VARCHAR(50) NOT NULL, -- money_in, money_out, p2p, split
  "amount" NUMERIC(15, 2) NOT NULL,
  "currency" VARCHAR(3) DEFAULT 'EUR',
  "status" VARCHAR(50) NOT NULL, -- pending, completed, failed, cancelled
  "direction" VARCHAR(20) NOT NULL, -- incoming, outgoing
  "debit_wallet" VARCHAR(100),
  "credit_wallet" VARCHAR(100),
  "comment" TEXT,
  "metadata" JSONB, -- Datos adicionales
  "raw_payload" JSONB, -- Payload completo de Lemonway
  "error_message" TEXT,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla para wallets de Lemonway
CREATE TABLE IF NOT EXISTS "LemonwayWallet" (
  "id" SERIAL PRIMARY KEY,
  "wallet_id" VARCHAR(100) UNIQUE NOT NULL,
  "user_email" VARCHAR(255),
  "user_type" VARCHAR(50), -- investor, borrower, platform
  "balance" NUMERIC(15, 2) DEFAULT 0,
  "status" VARCHAR(50), -- active, blocked, closed
  "kyc_status" VARCHAR(50), -- none, pending, validated, refused
  "kyc_level" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lemonway_transaction_wallet ON "LemonwayTransaction"("wallet_id");
CREATE INDEX IF NOT EXISTS idx_lemonway_transaction_status ON "LemonwayTransaction"("status");
CREATE INDEX IF NOT EXISTS idx_lemonway_transaction_type ON "LemonwayTransaction"("type");
CREATE INDEX IF NOT EXISTS idx_lemonway_wallet_email ON "LemonwayWallet"("user_email");
CREATE INDEX IF NOT EXISTS idx_lemonway_wallet_status ON "LemonwayWallet"("status");
