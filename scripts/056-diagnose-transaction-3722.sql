-- Diagnóstico de la transacción #3722
SELECT 
  id,
  request_id,
  endpoint,
  retry_count,
  retry_status,
  final_failure,
  manual_retry_needed,
  next_retry_at,
  created_at,
  sent_at,
  response_status,
  success,
  error_message
FROM "LemonwayApiCallLog"
WHERE request_id = '3722' OR id = 3722
ORDER BY id DESC;

-- Ver historial de reintentos
SELECT 
  api_call_log_id,
  attempt_number,
  success,
  response_status,
  error_message,
  created_at
FROM "LemonwayApiCallRetryHistory"
WHERE api_call_log_id IN (
  SELECT id FROM "LemonwayApiCallLog" WHERE request_id = '3722' OR id = 3722
)
ORDER BY attempt_number ASC;

-- Ver configuración de reintentos actual
SELECT key, value
FROM "AppConfig"
WHERE key IN ('lemonway_retry_delay_seconds', 'lemonway_max_retry_attempts', 'lemonway_manual_retry_enabled');
