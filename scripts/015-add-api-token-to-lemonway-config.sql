-- Migración para agregar api_token y eliminar columnas obsoletas
-- Este script convierte LemonwayConfig de login/password a api_token

-- Agregar columna api_token si no existe
ALTER TABLE "LemonwayConfig" 
ADD COLUMN IF NOT EXISTS "api_token" VARCHAR(255);

-- Eliminar columnas obsoletas si existen
ALTER TABLE "LemonwayConfig" 
DROP COLUMN IF EXISTS "login";

ALTER TABLE "LemonwayConfig" 
DROP COLUMN IF EXISTS "password";

ALTER TABLE "LemonwayConfig" 
DROP COLUMN IF EXISTS "api_key";

-- Eliminar columnas OAuth obsoletas si existen
ALTER TABLE "LemonwayConfig" 
DROP COLUMN IF EXISTS "bearer_token";

ALTER TABLE "LemonwayConfig" 
DROP COLUMN IF EXISTS "token_expires_at";

-- Actualizar registros existentes si es necesario
-- (No hay datos que migrar de login/password a api_token ya que son sistemas diferentes)

-- Actualizar timestamp
UPDATE "LemonwayConfig" 
SET "updated_at" = CURRENT_TIMESTAMP;
