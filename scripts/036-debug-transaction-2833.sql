-- Debug transacción #2833
-- Ver el estado actual de la transacción

SELECT 
  id,
  request_id,
  retry_status,
  retry_count,
  success,
  final_failure,
  next_retry_at,
  processing_lock_at,
  response_status,
  error_message,
  created_at,
  sent_at
FROM "LemonwayApiCallLog"
WHERE request_id = '2833';

-- Verificar si cumple las condiciones del retry-queue
SELECT 
  id,
  request_id,
  retry_status,
  retry_status IN ('pending', 'limit_pending') as "status_ok",
  (next_retry_at IS NULL OR next_retry_at <= NOW()) as "time_ok",
  retry_count,
  retry_count < 3 as "count_ok",
  final_failure,
  (final_failure = false OR final_failure IS NULL) as "failure_ok",
  processing_lock_at,
  (processing_lock_at IS NULL OR processing_lock_at < NOW() - INTERVAL '30 seconds') as "lock_ok"
FROM "LemonwayApiCallLog"
WHERE request_id = '2833';

-- Si final_failure es NULL, actualizarlo a false
UPDATE "LemonwayApiCallLog"
SET final_failure = false
WHERE request_id = '2833' AND final_failure IS NULL;

-- Si retry_status no está configurado correctamente, arreglarlo
UPDATE "LemonwayApiCallLog"
SET 
  retry_status = 'pending',
  next_retry_at = NOW()
WHERE request_id = '2833' 
  AND success = false 
  AND (retry_status IS NULL OR retry_status = 'none' OR retry_status = '');

-- Verificar el estado después de los cambios
SELECT 
  id,
  request_id,
  retry_status,
  retry_count,
  success,
  final_failure,
  next_retry_at,
  response_status
FROM "LemonwayApiCallLog"
WHERE request_id = '2833';
