-- Añadir cron jobs al sistema

-- Cambiado "isActive" a "is_active" para coincidir con el esquema real
-- Cambiado "createdAt"/"updatedAt" a "created_at"/"updated_at"

-- Verificación de integridad de vinculaciones (diaria a las 3:00 AM)
INSERT INTO public."CronJob" (name, schedule, endpoint, description, is_active, created_at, updated_at)
SELECT 
  'verify-wallet-links',
  '0 3 * * *',
  '/api/cron/verify-wallet-links',
  'Verifica la integridad de las vinculaciones entre wallets y cuentas virtuales',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public."CronJob" WHERE name = 'verify-wallet-links'
);

-- Verificación de SLA de tareas (cada hora)
INSERT INTO public."CronJob" (name, schedule, endpoint, description, is_active, created_at, updated_at)
SELECT 
  'check-task-sla',
  '0 * * * *',
  '/api/cron/check-task-sla',
  'Verifica SLA de tareas y escala las vencidas',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public."CronJob" WHERE name = 'check-task-sla'
);
