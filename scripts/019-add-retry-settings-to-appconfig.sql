-- Add Lemonway retry configuration to AppConfig
INSERT INTO "AppConfig" (id, key, value, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid()::text, 'lemonway_retry_delay_seconds', '120', NOW(), NOW()),
  (gen_random_uuid()::text, 'lemonway_max_retry_attempts', '2', NOW(), NOW()),
  (gen_random_uuid()::text, 'lemonway_manual_retry_enabled', 'true', NOW(), NOW())
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, "updatedAt" = NOW();
