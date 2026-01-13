-- Verificar estado actual de la transacción #2833
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
WHERE request_id = '2833';

-- Verificar historial de reintentos
SELECT * FROM "LemonwayApiCallRetryHistory"
WHERE api_call_log_id = (
    SELECT id FROM "LemonwayApiCallLog" WHERE request_id = '2833' LIMIT 1
)
ORDER BY attempt_number;

-- Actualizar retry_count a 1
UPDATE "LemonwayApiCallLog"
SET retry_count = 1
WHERE request_id = '2833';

-- Verificar resultado
SELECT 
    id,
    request_id,
    retry_count,
    retry_status,
    response_status,
    success
FROM "LemonwayApiCallLog"
WHERE request_id = '2833';
