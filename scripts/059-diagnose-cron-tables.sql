-- Verificar en qué schema están las tablas de cron
SELECT 
    schemaname, 
    tablename 
FROM pg_tables 
WHERE tablename IN ('CronJob', 'CronJobExecution')
ORDER BY schemaname, tablename;

-- Contar registros en CronJob (probar ambos schemas)
SELECT 'public.CronJob' as tabla, COUNT(*) as total FROM public."CronJob";

-- Contar registros en CronJobExecution (probar ambos schemas)
SELECT 'public.CronJobExecution' as tabla, COUNT(*) as total FROM public."CronJobExecution";

-- Ver los registros de CronJob
SELECT * FROM public."CronJob";

-- Ver las últimas 10 ejecuciones
SELECT 
    e.id,
    e.cron_job_id,
    j.name as job_name,
    e.status,
    e.started_at,
    e.finished_at,
    e.duration_ms,
    e.error_message
FROM public."CronJobExecution" e
JOIN public."CronJob" j ON e.cron_job_id = j.id
ORDER BY e.started_at DESC
LIMIT 10;
