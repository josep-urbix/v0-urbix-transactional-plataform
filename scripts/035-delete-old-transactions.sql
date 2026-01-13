-- Script para borrar todas las transacciones que NO sean de hoy
-- Fecha: 2026-01-04

-- 1. Ver cuántas transacciones hay por día (antes de borrar)
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as total
FROM "LemonwayApiCallLog"
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- 2. Primero borrar el historial de reintentos de transacciones antiguas
DELETE FROM "LemonwayApiCallRetryHistory"
WHERE api_call_log_id IN (
  SELECT id FROM "LemonwayApiCallLog"
  WHERE DATE(created_at) < CURRENT_DATE
);

-- 3. Borrar las transacciones antiguas
DELETE FROM "LemonwayApiCallLog"
WHERE DATE(created_at) < CURRENT_DATE;

-- 4. Verificar el resultado
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as total
FROM "LemonwayApiCallLog"
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- 5. Mostrar resumen final
SELECT 
  COUNT(*) as total_transacciones_hoy,
  COUNT(CASE WHEN success = true THEN 1 END) as exitosas,
  COUNT(CASE WHEN success = false THEN 1 END) as fallidas,
  COUNT(CASE WHEN success IS NULL THEN 1 END) as pendientes
FROM "LemonwayApiCallLog";
