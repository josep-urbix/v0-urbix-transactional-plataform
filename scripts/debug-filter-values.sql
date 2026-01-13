-- Script para ver los valores únicos de retry_status y success en la base de datos
-- Esto nos ayudará a entender exactamente qué valores filtrar

-- Valores únicos de retry_status
SELECT retry_status, COUNT(*) as count
FROM "LemonwayApiCallLog"
GROUP BY retry_status
ORDER BY count DESC;

-- Valores únicos de success
SELECT success, COUNT(*) as count
FROM "LemonwayApiCallLog"
GROUP BY success
ORDER BY count DESC;

-- Combinaciones de retry_status y success
SELECT retry_status, success, COUNT(*) as count
FROM "LemonwayApiCallLog"
GROUP BY retry_status, success
ORDER BY count DESC;

-- Verificar si hay registros con final_failure = true
SELECT final_failure, COUNT(*) as count
FROM "LemonwayApiCallLog"
GROUP BY final_failure;
