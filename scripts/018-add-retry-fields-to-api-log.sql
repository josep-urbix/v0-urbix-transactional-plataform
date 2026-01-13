-- Agregar campos para sistema de reintentos automáticos
ALTER TABLE "LemonwayApiCallLog" 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_status VARCHAR(50) DEFAULT 'none',
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS manual_retry_needed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS final_failure BOOLEAN DEFAULT false;

-- Índices para mejorar consultas de cola de reintentos
CREATE INDEX IF NOT EXISTS idx_lemonway_retry_status ON "LemonwayApiCallLog"(retry_status);
CREATE INDEX IF NOT EXISTS idx_lemonway_next_retry ON "LemonwayApiCallLog"(next_retry_at) WHERE retry_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_lemonway_manual_retry ON "LemonwayApiCallLog"(manual_retry_needed) WHERE manual_retry_needed = true;

COMMENT ON COLUMN "LemonwayApiCallLog".retry_count IS 'Número de reintentos realizados';
COMMENT ON COLUMN "LemonwayApiCallLog".retry_status IS 'Estado: none, pending, retrying, success, failed';
COMMENT ON COLUMN "LemonwayApiCallLog".next_retry_at IS 'Timestamp del próximo reintento programado';
COMMENT ON COLUMN "LemonwayApiCallLog".manual_retry_needed IS 'Indica si requiere reintento manual';
COMMENT ON COLUMN "LemonwayApiCallLog".final_failure IS 'Indica si falló después de todos los reintentos';
