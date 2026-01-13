-- Forzar actualización de la transacción #2833
UPDATE "LemonwayApiCallLog"
SET retry_count = 1,
    retry_status = 'success'
WHERE request_id = '2833';

-- Verificar el cambio
SELECT 
    request_id,
    retry_count,
    retry_status,
    success,
    response_status
FROM "LemonwayApiCallLog"
WHERE request_id = '2833';
