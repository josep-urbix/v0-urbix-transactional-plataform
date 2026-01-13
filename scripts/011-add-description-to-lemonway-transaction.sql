-- Agregar columna description a LemonwayTransaction
-- Esta columna es necesaria para almacenar descripciones de transacciones de autenticación y otros tipos

ALTER TABLE "LemonwayTransaction" 
ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Migrar datos existentes de comment a description si existen
UPDATE "LemonwayTransaction" 
SET "description" = "comment" 
WHERE "description" IS NULL AND "comment" IS NOT NULL;
