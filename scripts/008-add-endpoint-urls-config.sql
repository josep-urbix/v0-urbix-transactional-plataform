-- Agregar configuración de endpoints múltiples para Lemonway
-- El campo api_url ahora solo se usa para AUTH2, los demás endpoints se configuran individualmente

ALTER TABLE "LemonwayConfig"
ADD COLUMN IF NOT EXISTS oauth_url TEXT,
ADD COLUMN IF NOT EXISTS accounts_retrieve_url TEXT,
ADD COLUMN IF NOT EXISTS accounts_kycstatus_url TEXT,
ADD COLUMN IF NOT EXISTS accounts_balances_url TEXT,
ADD COLUMN IF NOT EXISTS transactions_list_url TEXT,
ADD COLUMN IF NOT EXISTS endpoint_urls JSONB DEFAULT '{}'::jsonb;

-- Comentar las columnas para documentación
COMMENT ON COLUMN "LemonwayConfig".oauth_url IS 'URL específica para el endpoint de OAuth 2.0 (obtener Bearer token)';
COMMENT ON COLUMN "LemonwayConfig".accounts_retrieve_url IS 'URL específica para el endpoint /accounts/retrieve';
COMMENT ON COLUMN "LemonwayConfig".accounts_kycstatus_url IS 'URL específica para el endpoint /accounts/kycstatus';
COMMENT ON COLUMN "LemonwayConfig".accounts_balances_url IS 'URL específica para el endpoint /accounts/balances';
COMMENT ON COLUMN "LemonwayConfig".transactions_list_url IS 'URL específica para el endpoint /transactions/list';
COMMENT ON COLUMN "LemonwayConfig".endpoint_urls IS 'JSONB con URLs de todos los endpoints personalizados';
