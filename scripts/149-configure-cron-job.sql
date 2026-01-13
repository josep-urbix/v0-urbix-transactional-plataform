-- Registrar el cron job de procesamiento de movimientos aprobados en la tabla de configuración
INSERT INTO public."CronJob" (
  name,
  description,
  endpoint,
  schedule,
  is_active,
  created_at,
  updated_at
) VALUES (
  'process-approved-movements',
  'Procesa automáticamente movimientos aprobados desde la cola temporal a la tabla definitiva',
  '/api/cron/process-approved-movements',
  '*/5 * * * *',  -- Cada 5 minutos
  true,
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Verificar que el cron fue registrado
SELECT name, endpoint, schedule, is_active FROM public."CronJob" WHERE name = 'process-approved-movements';
