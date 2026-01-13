-- Recuperar historial de reintentos para transacciones que ya fueron procesadas
-- pero no tienen registro en el historial

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
LEFT JOIN "LemonwayApiCallRetryHistory" h ON h.api_call_log_id = l.id
WHERE l.response_status IS NOT NULL
  AND h.id IS NULL
ORDER BY l.id;
