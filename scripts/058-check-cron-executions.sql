-- Verificar los cron jobs registrados
SELECT * FROM public."CronJob" ORDER BY id;

-- Verificar las ejecuciones registradas
SELECT * FROM public."CronJobExecution" ORDER BY started_at DESC LIMIT 20;

-- Verificar si el cron retry-queue está registrado
SELECT * FROM public."CronJob" WHERE name = 'retry-queue';
