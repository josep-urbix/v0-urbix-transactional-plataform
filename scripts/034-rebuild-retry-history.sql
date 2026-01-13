-- =====================================================
-- Script para reconstruir el historial de reintentos
-- =====================================================

-- 1. Ver estado actual antes de cambios
SELECT 'ANTES DE CAMBIOS' as seccion;

SELECT 
  COUNT(*) as total_transacciones_con_reintentos,
  (SELECT COUNT(DISTINCT api_call_log_id) FROM "LemonwayApiCallRetryHistory") as con_historial,
  COUNT(*) - (SELECT COUNT(DISTINCT api_call_log_id) FROM "LemonwayApiCallRetryHistory") as sin_historial
FROM "LemonwayApiCallLog"
WHERE retry_count > 0;

-- 2. Limpiar historial existente duplicado o inconsistente
DELETE FROM "LemonwayApiCallRetryHistory" h
WHERE NOT EXISTS (
  SELECT 1 FROM "LemonwayApiCallLog" l 
  WHERE l.id = h.api_call_log_id
);

SELECT 'Eliminados registros huérfanos del historial' as accion;

-- 3. Insertar historial para transacciones con retry_count > 0 que no tienen historial
-- Esto crea un registro con el estado ACTUAL de la transacción como el último intento
INSERT INTO "LemonwayApiCallRetryHistory" (
  api_call_log_id,
  attempt_number,
  response_status,
  success,
  error_message,
  duration_ms,
  response_payload,
  created_at
)
SELECT 
  l.id as api_call_log_id,
  l.retry_count as attempt_number,
  l.response_status,
  l.success,
  l.error_message,
  l.duration_ms,
  l.response_payload,
  COALESCE(l.sent_at, l.created_at) as created_at
FROM "LemonwayApiCallLog" l
WHERE l.retry_count > 0
  AND l.response_status IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "LemonwayApiCallRetryHistory" h 
    WHERE h.api_call_log_id = l.id 
    AND h.attempt_number = l.retry_count
  );

SELECT 'Insertados registros de historial para el intento actual' as accion;

-- 4. Para transacciones con retry_count >= 1, crear registro del intento 0 (primer intento fallido)
-- Asumimos que el primer intento falló si hay reintentos
INSERT INTO "LemonwayApiCallRetryHistory" (
  api_call_log_id,
  attempt_number,
  response_status,
  success,
  error_message,
  duration_ms,
  response_payload,
  created_at
)
SELECT 
  l.id as api_call_log_id,
  0 as attempt_number,
  503 as response_status,
  false as success,
  'Error inicial (historial reconstruido)' as error_message,
  l.duration_ms,
  NULL as response_payload,
  l.created_at as created_at
FROM "LemonwayApiCallLog" l
WHERE l.retry_count > 0
  AND NOT EXISTS (
    SELECT 1 FROM "LemonwayApiCallRetryHistory" h 
    WHERE h.api_call_log_id = l.id 
    AND h.attempt_number = 0
  );

SELECT 'Insertados registros de intento inicial (attempt 0)' as accion;

-- 5. Para transacciones que ya tienen éxito (success=true) pero retry_count = 0 y retry_status = 'none'
-- No necesitan historial, están correctas

-- 6. Limpiar transacciones inconsistentes que no se pueden recuperar:
-- Transacciones con retry_count > 0 pero sin response_status (nunca se enviaron realmente)
UPDATE "LemonwayApiCallLog"
SET 
  retry_count = 0,
  retry_status = CASE 
    WHEN success = true THEN 'none'
    WHEN success = false THEN 'failed'
    ELSE 'pending'
  END
WHERE retry_count > 0 
  AND response_status IS NULL;

SELECT 'Corregidas transacciones inconsistentes' as accion;

-- 7. Ver estado final
SELECT 'DESPUÉS DE CAMBIOS' as seccion;

SELECT 
  COUNT(*) as total_transacciones_con_reintentos,
  (SELECT COUNT(DISTINCT api_call_log_id) FROM "LemonwayApiCallRetryHistory") as con_historial,
  COUNT(*) - (SELECT COUNT(DISTINCT api_call_log_id) FROM "LemonwayApiCallRetryHistory") as sin_historial
FROM "LemonwayApiCallLog"
WHERE retry_count > 0;

-- 8. Resumen del historial reconstruido
SELECT 
  l.id,
  l.request_id,
  l.retry_count,
  l.retry_status,
  l.success,
  l.response_status,
  COUNT(h.id) as registros_historial
FROM "LemonwayApiCallLog" l
LEFT JOIN "LemonwayApiCallRetryHistory" h ON l.id = h.api_call_log_id
WHERE l.retry_count > 0
GROUP BY l.id, l.request_id, l.retry_count, l.retry_status, l.success, l.response_status
ORDER BY l.id DESC
LIMIT 20;

-- 9. Verificación final de consistencia
SELECT 
  'Transacciones con retry_count > registros en historial' as verificacion,
  COUNT(*) as cantidad
FROM "LemonwayApiCallLog" l
WHERE l.retry_count > 0
  AND l.retry_count > (
    SELECT COUNT(*) FROM "LemonwayApiCallRetryHistory" h 
    WHERE h.api_call_log_id = l.id
  );
