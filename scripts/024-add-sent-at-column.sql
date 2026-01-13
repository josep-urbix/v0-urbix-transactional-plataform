-- Agregar columna sent_at para registrar cuando se envía realmente la petición a Lemonway
ALTER TABLE "LemonwayApiCallLog" 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NULL;

-- Actualizar registros existentes: si tienen response_status (fueron enviados), usar created_at como sent_at
UPDATE "LemonwayApiCallLog" 
SET sent_at = created_at 
WHERE sent_at IS NULL AND response_status IS NOT NULL;

-- Crear índice para consultas por fecha de envío
CREATE INDEX IF NOT EXISTS idx_lemonway_api_call_log_sent_at ON "LemonwayApiCallLog" (sent_at);
