-- Añadir columnas para el sistema de reintentos
ALTER TABLE "LemonwayApiCallLog" ADD COLUMN IF NOT EXISTS "retry_status" VARCHAR(50);
ALTER TABLE "LemonwayApiCallLog" ADD COLUMN IF NOT EXISTS "retry_count" INTEGER DEFAULT 0;
ALTER TABLE "LemonwayApiCallLog" ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMP;
ALTER TABLE "LemonwayApiCallLog" ADD COLUMN IF NOT EXISTS "final_failure" BOOLEAN DEFAULT false;
ALTER TABLE "LemonwayApiCallLog" ADD COLUMN IF NOT EXISTS "processing_lock_at" TIMESTAMP;
ALTER TABLE "LemonwayApiCallLog" ADD COLUMN IF NOT EXISTS "manual_retry_needed" BOOLEAN DEFAULT false;

-- Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS "idx_lemonway_api_call_log_retry_status" ON "LemonwayApiCallLog"("retry_status");
CREATE INDEX IF NOT EXISTS "idx_lemonway_api_call_log_next_retry_at" ON "LemonwayApiCallLog"("next_retry_at");

-- Actualizar logs existentes para que tengan retry_status
UPDATE "LemonwayApiCallLog" 
SET retry_status = CASE 
  WHEN success = true THEN 'completed'
  ELSE 'pending'
END
WHERE retry_status IS NULL;
