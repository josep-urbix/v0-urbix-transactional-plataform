-- Registrar el cron job interno para procesar movimientos aprobados
INSERT INTO "CronJob" (name, description, endpoint, schedule, is_active, created_at)
VALUES (
  'Procesar Movimientos Aprobados de Lemonway',
  'Procesa automáticamente los movimientos aprobados de importaciones de Lemonway, transfiriéndolos a la tabla de movimientos definitiva',
  '/api/admin/lemonway/process-movements',
  '*/5 * * * *',
  true,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Si ya existe, asegurarse de que está activo
UPDATE "CronJob"
SET is_active = true, updated_at = NOW()
WHERE name = 'Procesar Movimientos Aprobados de Lemonway';
