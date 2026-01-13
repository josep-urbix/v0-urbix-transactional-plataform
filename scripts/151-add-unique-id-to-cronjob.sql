-- Agregar columna unique_id a tabla CronJob
ALTER TABLE public."CronJob" 
ADD COLUMN IF NOT EXISTS unique_id UUID DEFAULT gen_random_uuid() UNIQUE;

-- Generar UUIDs únicos para registros existentes que no tengan
UPDATE public."CronJob"
SET unique_id = gen_random_uuid()
WHERE unique_id IS NULL;

-- Hacer la columna NOT NULL
ALTER TABLE public."CronJob"
ALTER COLUMN unique_id SET NOT NULL;

-- Crear índice para búsquedas por unique_id
CREATE INDEX IF NOT EXISTS idx_cronjob_unique_id ON public."CronJob"(unique_id);
