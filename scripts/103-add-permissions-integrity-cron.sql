-- Añadir tarea cron para verificar integridad de permisos diariamente
INSERT INTO public."CronJob" (name, description, endpoint, schedule, is_active)
VALUES (
  'verify-permissions-integrity',
  'Verifica y corrige automáticamente la integridad del sistema RBAC (permisos y roles)',
  '/api/cron/verify-permissions-integrity',
  '0 2 * * *', -- Cada día a las 2:00 AM
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  endpoint = EXCLUDED.endpoint,
  schedule = EXCLUDED.schedule,
  updated_at = NOW();
