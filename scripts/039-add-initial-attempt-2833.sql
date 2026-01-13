-- Verificar historial actual de #2833
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

-- Obtener el id del log de #2833
-- Insertar el intento inicial (attempt 0) con el error 403
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
  id as api_call_log_id,
  0 as attempt_number,
  403 as response_status,
  false as success,
  'Forbidden - IP no autorizada en Lemonway/Cloudflare' as error_message,
  NULL as duration_ms,
  NULL as response_payload,
  created_at as created_at
FROM "LemonwayApiCallLog"
WHERE request_id = '2833'
AND NOT EXISTS (
  SELECT 1 FROM "LemonwayApiCallRetryHistory" h 
  WHERE h.api_call_log_id = "LemonwayApiCallLog".id 
  AND h.attempt_number = 0
);

-- Verificar historial después de insertar
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
