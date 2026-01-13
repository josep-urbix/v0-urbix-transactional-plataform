-- Registrar el cron job para procesar importaciones de Lemonway
INSERT INTO public."CronJob" (name, description, endpoint, schedule, is_active)
VALUES (
  'process-lemonway-imports',
  'Procesa automáticamente las importaciones pendientes de transacciones de Lemonway',
  '/api/cron/process-lemonway-imports',
  '*/5 * * * *', -- Cada 5 minutos
  true
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  endpoint = EXCLUDED.endpoint,
  schedule = EXCLUDED.schedule,
  updated_at = NOW();

-- Verificar que se haya insertado correctamente
SELECT id, name, description, endpoint, schedule, is_active, created_at 
FROM public."CronJob" 
WHERE name = 'process-lemonway-imports';
