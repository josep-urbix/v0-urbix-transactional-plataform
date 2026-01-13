-- Verificar emails enviados y su estado de tracking
SELECT 
  id,
  to_email,
  subject,
  status,
  sent_at,
  opened_at,
  metadata->>'open_count' as open_count,
  metadata->'open_tracking'->>'first_open' as first_opened,
  metadata->'open_tracking'->>'last_open' as last_opened,
  metadata->'open_tracking'->>'user_agent' as user_agent
FROM emails.email_sends
ORDER BY created_at DESC
LIMIT 10;
