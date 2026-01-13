-- Agregar campo de bloqueo para control de deduplicación
ALTER TABLE "LemonwayApiCallLog" 
ADD COLUMN IF NOT EXISTS processing_lock_at TIMESTAMPTZ DEFAULT NULL;

-- Índice para búsqueda eficiente de peticiones en proceso
CREATE INDEX IF NOT EXISTS idx_lemonway_processing_lock 
ON "LemonwayApiCallLog" (processing_lock_at) 
WHERE processing_lock_at IS NOT NULL;

-- Índice para búsqueda por account_id en request_payload
CREATE INDEX IF NOT EXISTS idx_lemonway_request_payload 
ON "LemonwayApiCallLog" USING GIN (request_payload);
