-- Agregar campos para OAuth 2.0 a la configuración de Lemonway
ALTER TABLE "LemonwayConfig" 
  ADD COLUMN IF NOT EXISTS "bearer_token" TEXT,
  ADD COLUMN IF NOT EXISTS "token_expires_at" TIMESTAMP;

-- Renombrar api_token a api_key para mayor claridad
ALTER TABLE "LemonwayConfig" 
  RENAME COLUMN "api_token" TO "api_key";

COMMENT ON COLUMN "LemonwayConfig"."api_key" IS 'API Key básica para obtener Bearer token (OAuth 2.0)';
COMMENT ON COLUMN "LemonwayConfig"."bearer_token" IS 'Bearer token obtenido mediante OAuth 2.0';
COMMENT ON COLUMN "LemonwayConfig"."token_expires_at" IS 'Fecha de expiración del Bearer token';
