-- Verificar si hay registros en el historial de reintentos
SELECT COUNT(*) as total_history FROM "LemonwayApiCallRetryHistory";

-- Ver los últimos 10 registros del historial
SELECT * FROM "LemonwayApiCallRetryHistory" ORDER BY created_at DESC LIMIT 10;

-- Ver transacciones con reintentos que deberían tener historial
SELECT 
  id,
  request_id,
  retry_count,
  retry_status,
  response_status,
  success,
  created_at,
  sent_at
FROM "LemonwayApiCallLog"
WHERE retry_count > 0
ORDER BY id DESC
LIMIT 20;
