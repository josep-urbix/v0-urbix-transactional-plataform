-- Agregar campo request_id para identificar peticiones únicas incluso con reintentos
ALTER TABLE "LemonwayApiCallLog" ADD COLUMN IF NOT EXISTS "request_id" VARCHAR(100);

-- Para registros existentes, usar el id como request_id
UPDATE "LemonwayApiCallLog" SET "request_id" = CAST("id" AS VARCHAR) WHERE "request_id" IS NULL;

-- Crear índice para búsquedas por request_id
CREATE INDEX IF NOT EXISTS "idx_lemonway_api_call_log_request_id" ON "LemonwayApiCallLog"("request_id");
