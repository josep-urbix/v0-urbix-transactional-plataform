-- Tabla para almacenar el historial de reintentos
CREATE TABLE IF NOT EXISTS "LemonwayApiCallRetryHistory" (
  id SERIAL PRIMARY KEY,
  api_call_log_id INTEGER NOT NULL REFERENCES "LemonwayApiCallLog"(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 0,
  response_status INTEGER,
  success BOOLEAN,
  error_message TEXT,
  duration_ms INTEGER,
  response_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por api_call_log_id
CREATE INDEX IF NOT EXISTS idx_retry_history_api_call_log_id 
ON "LemonwayApiCallRetryHistory"(api_call_log_id);

-- Índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_retry_history_created_at 
ON "LemonwayApiCallRetryHistory"(created_at DESC);
