-- Consultar los últimos webhooks fallidos de Lemonway
SELECT 
  id,
  event_type,
  processing_status,
  notif_category,
  wallet_ext_id,
  wallet_int_id,
  transaction_id,
  amount,
  status_code,
  error_message,
  received_at,
  processed_at,
  raw_payload
FROM lemonway_webhooks."WebhookDelivery"
WHERE processing_status IN ('FAILED', 'RECEIVED')
ORDER BY received_at DESC
LIMIT 10;
