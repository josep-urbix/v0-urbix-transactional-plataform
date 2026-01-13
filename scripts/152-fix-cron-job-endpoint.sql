-- Actualizar el cron job con el endpoint correcto
UPDATE "CronJob"
SET endpoint = '/api/cron/process-approved-movements'
WHERE name = 'Procesar Movimientos Aprobados de Lemonway';
