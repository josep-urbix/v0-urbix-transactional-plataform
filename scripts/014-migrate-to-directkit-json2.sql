-- Migrar LemonwayConfig para usar DirectKit JSON2 (wlLogin y wlPass)
-- Eliminar columnas de OAuth que no se usan en DirectKit JSON2
ALTER TABLE "LemonwayConfig" 
  DROP COLUMN IF EXISTS "bearer_token",
  DROP COLUMN IF EXISTS "token_expires_at";

-- Renombrar/agregar columnas para DirectKit JSON2
ALTER TABLE "LemonwayConfig" 
  ADD COLUMN IF NOT EXISTS "wl_login" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "wl_pass" VARCHAR(255);

-- Migrar api_token a wl_login si existe
UPDATE "LemonwayConfig" 
SET "wl_login" = "api_token"
WHERE "wl_login" IS NULL AND "api_token" IS NOT NULL;

-- Actualizar URL por defecto para DirectKit JSON2
UPDATE "LemonwayConfig"
SET "api_url" = 'https://sandbox-api.lemonway.fr/mb/demo/dev/directkitjson2/Service.asmx'
WHERE "environment" = 'sandbox' AND ("api_url" = 'https://sandbox-api.lemonway.fr' OR "api_url" = 'https://sb-bo.lemonway.com/urbix');
