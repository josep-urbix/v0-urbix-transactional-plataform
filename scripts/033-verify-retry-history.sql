-- Script para verificar cuántas transacciones con reintentos tienen historial
-- Ejecutar en Neon

-- 1. Transacciones con más de 1 reintento (retry_count > 0)
SELECT 
  'Transacciones con reintentos (retry_count > 0)' as descripcion,
  COUNT(DISTINCT request_id) as total
FROM "LemonwayApiCallLog"
WHERE retry_count > 0;

-- 2. Transacciones con historial en LemonwayApiCallRetryHistory
SELECT 
  'Transacciones con historial' as descripcion,
  COUNT(DISTINCT api_call_log_id) as total
FROM "LemonwayApiCallRetryHistory";

-- 3. Transacciones con reintentos que SÍ tienen historial
SELECT 
  'Con reintentos Y con historial' as descripcion,
  COUNT(DISTINCT l.request_id) as total
FROM "LemonwayApiCallLog" l
INNER JOIN "LemonwayApiCallRetryHistory" h ON h.api_call_log_id = l.id
WHERE l.retry_count > 0;

-- 4. Transacciones con reintentos que NO tienen historial
SELECT 
  'Con reintentos SIN historial' as descripcion,
  COUNT(DISTINCT l.request_id) as total
FROM "LemonwayApiCallLog" l
LEFT JOIN "LemonwayApiCallRetryHistory" h ON h.api_call_log_id = l.id
WHERE l.retry_count > 0
  AND h.id IS NULL;

-- 5. Detalle de transacciones con reintentos sin historial (primeras 20)
SELECT 
  l.request_id,
  l.endpoint,
  l.retry_count,
  l.retry_status,
  l.success,
  l.response_status,
  l.created_at,
  l.sent_at
FROM "LemonwayApiCallLog" l
LEFT JOIN "LemonwayApiCallRetryHistory" h ON h.api_call_log_id = l.id
WHERE l.retry_count > 0
  AND h.id IS NULL
ORDER BY l.created_at DESC
LIMIT 20;

-- 6. Resumen por retry_status de las que tienen reintentos sin historial
SELECT 
  l.retry_status,
  COUNT(*) as cantidad
FROM "LemonwayApiCallLog" l
LEFT JOIN "LemonwayApiCallRetryHistory" h ON h.api_call_log_id = l.id
WHERE l.retry_count > 0
  AND h.id IS NULL
GROUP BY l.retry_status
ORDER BY cantidad DESC;
