-- Script para agregar las columnas faltantes a LemonwayTransaction
-- y renombrar/migrar las existentes

-- Agregar columna description si no existe
ALTER TABLE "LemonwayTransaction" 
ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Agregar columna request_payload si no existe
ALTER TABLE "LemonwayTransaction" 
ADD COLUMN IF NOT EXISTS "request_payload" JSONB;

-- Agregar columna response_payload si no existe
ALTER TABLE "LemonwayTransaction" 
ADD COLUMN IF NOT EXISTS "response_payload" JSONB;

-- Migrar datos de comment a description si description está vacía
UPDATE "LemonwayTransaction" 
SET "description" = "comment" 
WHERE "description" IS NULL AND "comment" IS NOT NULL;

-- Migrar datos de raw_payload a response_payload si response_payload está vacía
UPDATE "LemonwayTransaction" 
SET "response_payload" = "raw_payload" 
WHERE "response_payload" IS NULL AND "raw_payload" IS NOT NULL;

-- Crear índices para las nuevas columnas JSONB si no existen
CREATE INDEX IF NOT EXISTS idx_lemonway_transaction_request_payload ON "LemonwayTransaction" USING GIN ("request_payload");
CREATE INDEX IF NOT EXISTS idx_lemonway_transaction_response_payload ON "LemonwayTransaction" USING GIN ("response_payload");
