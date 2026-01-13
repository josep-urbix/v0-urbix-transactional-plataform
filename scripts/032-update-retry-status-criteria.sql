-- Script para actualizar retry_status según el nuevo criterio:
-- - 'none': Transacción exitosa en el primer intento (retry_count = 0)
-- - 'success': Transacción exitosa después de reintentos (retry_count > 0)
-- - 'pending'/'limit_pending': Esperando reintento (sin cambios)
-- - 'failed': Fallo final (sin cambios)

-- Primero verificamos el estado actual
SELECT 
  retry_status,
  success,
  retry_count,
  COUNT(*) as total
FROM "LemonwayApiCallLog"
GROUP BY retry_status, success, retry_count
ORDER BY retry_status, success, retry_count;

-- 1. Transacciones exitosas en el primer intento -> 'none'
UPDATE "LemonwayApiCallLog"
SET retry_status = 'none'
WHERE success = true 
  AND (retry_count = 0 OR retry_count IS NULL)
  AND retry_status != 'none';

-- 2. Transacciones exitosas después de reintentos -> 'success'
UPDATE "LemonwayApiCallLog"
SET retry_status = 'success'
WHERE success = true 
  AND retry_count > 0
  AND retry_status != 'success';

-- 3. Transacciones fallidas que agotaron reintentos -> 'failed'
UPDATE "LemonwayApiCallLog"
SET retry_status = 'failed'
WHERE success = false 
  AND final_failure = true
  AND retry_status NOT IN ('failed');

-- 4. Transacciones con error HTTP pero sin retry_status correcto -> 'pending' para reintento
UPDATE "LemonwayApiCallLog"
SET 
  retry_status = 'pending',
  next_retry_at = NOW() + INTERVAL '1 second'
WHERE success = false 
  AND (final_failure = false OR final_failure IS NULL)
  AND response_status IN (503, 520, 429, 500, 502, 504)
  AND retry_status NOT IN ('pending', 'limit_pending', 'failed')
  AND (retry_count < 3 OR retry_count IS NULL);

-- 5. Limpiar retry_status vacíos o incorrectos para transacciones exitosas
UPDATE "LemonwayApiCallLog"
SET retry_status = 'none'
WHERE success = true 
  AND (retry_status IS NULL OR retry_status = '' OR retry_status = 'limit_pending');

-- Verificar resultado final
SELECT 
  retry_status,
  success,
  COUNT(*) as total,
  SUM(CASE WHEN retry_count = 0 OR retry_count IS NULL THEN 1 ELSE 0 END) as sin_reintentos,
  SUM(CASE WHEN retry_count > 0 THEN 1 ELSE 0 END) as con_reintentos
FROM "LemonwayApiCallLog"
GROUP BY retry_status, success
ORDER BY retry_status, success;
