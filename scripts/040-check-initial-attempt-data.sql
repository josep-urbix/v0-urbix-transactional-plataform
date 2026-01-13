-- Verificar qué información tenemos del primer intento de la transacción #2833

-- 1. Ver todos los campos del registro principal
SELECT 
    id,
    request_id,
    created_at,
    sent_at,
    response_status,
    success,
    error_message,
    duration_ms,
    retry_count,
    retry_status,
    next_retry_at,
    processing_lock_at,
    final_failure
FROM "LemonwayApiCallLog"
WHERE request_id = '2833'
ORDER BY id;

-- 2. Ver el historial de reintentos existente
SELECT 
    h.id,
    h.api_call_log_id,
    h.attempt_number,
    h.response_status,
    h.success,
    h.error_message,
    h.duration_ms,
    h.created_at
FROM "LemonwayApiCallRetryHistory" h
JOIN "LemonwayApiCallLog" l ON h.api_call_log_id = l.id
WHERE l.request_id = '2833'
ORDER BY h.attempt_number;

-- 3. Verificar si hay múltiples registros para este request_id (que contendrían el historial)
SELECT COUNT(*) as total_records
FROM "LemonwayApiCallLog"
WHERE request_id = '2833';
