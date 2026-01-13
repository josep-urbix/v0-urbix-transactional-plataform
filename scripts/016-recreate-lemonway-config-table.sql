-- Drop and recreate LemonwayConfig table with correct schema
DROP TABLE IF EXISTS "LemonwayConfig" CASCADE;

CREATE TABLE IF NOT EXISTS "LemonwayConfig" (
  id SERIAL PRIMARY KEY,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  api_base_url TEXT,
  wallet_id TEXT,
  api_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default config with your API token
INSERT INTO "LemonwayConfig" (environment, api_base_url, wallet_id, api_token)
VALUES (
  'sandbox',
  'https://sandbox-api.lemonway.fr',
  '105',
  'c65625d2-9851-4915-8d62-272a8ece21aa'
);
