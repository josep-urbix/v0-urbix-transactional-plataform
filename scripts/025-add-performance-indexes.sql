-- Agregar índices para mejorar el rendimiento de las consultas de transacciones

-- Índice compuesto para ordenamiento y filtrado principal
CREATE INDEX IF NOT EXISTS idx_lemonway_apicalllog_request_created 
ON "LemonwayApiCallLog" (request_id, created_at DESC);

-- Índice para filtrado por retry_status
CREATE INDEX IF NOT EXISTS idx_lemonway_apicalllog_retry_status 
ON "LemonwayApiCallLog" (retry_status) WHERE retry_status != 'deleted';

-- Índice para filtrado por success
CREATE INDEX IF NOT EXISTS idx_lemonway_apicalllog_success 
ON "LemonwayApiCallLog" (success);

-- Índice para final_failure
CREATE INDEX IF NOT EXISTS idx_lemonway_apicalllog_final_failure 
ON "LemonwayApiCallLog" (final_failure) WHERE final_failure = true;

-- Índice para next_retry_at (usado en cola)
CREATE INDEX IF NOT EXISTS idx_lemonway_apicalllog_next_retry 
ON "LemonwayApiCallLog" (next_retry_at) 
WHERE retry_status IN ('pending', 'limit_pending');

-- Índice para id (usado en ordenamiento)
CREATE INDEX IF NOT EXISTS idx_lemonway_apicalllog_id 
ON "LemonwayApiCallLog" (id DESC);
