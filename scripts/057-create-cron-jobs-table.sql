-- Crear tabla para gestionar las tareas del cron
CREATE TABLE IF NOT EXISTS public."CronJob" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  endpoint VARCHAR(500) NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(50),
  last_run_duration_ms INTEGER,
  last_run_error TEXT,
  total_runs INTEGER DEFAULT 0,
  successful_runs INTEGER DEFAULT 0,
  failed_runs INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear tabla para logs de ejecuciones del cron
CREATE TABLE IF NOT EXISTS public."CronJobExecution" (
  id SERIAL PRIMARY KEY,
  cron_job_id INTEGER REFERENCES public."CronJob"(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT NOW(),
  finished_at TIMESTAMP,
  duration_ms INTEGER,
  status VARCHAR(50) NOT NULL, -- 'running', 'success', 'failed'
  result_data JSONB,
  error_message TEXT,
  error_stack TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_cron_job_name ON public."CronJob"(name);
CREATE INDEX IF NOT EXISTS idx_cron_job_is_active ON public."CronJob"(is_active);
CREATE INDEX IF NOT EXISTS idx_cron_execution_job_id ON public."CronJobExecution"(cron_job_id);
CREATE INDEX IF NOT EXISTS idx_cron_execution_started_at ON public."CronJobExecution"(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_execution_status ON public."CronJobExecution"(status);

-- Insertar la tarea de cron existente
INSERT INTO public."CronJob" (name, description, endpoint, schedule, is_active)
VALUES (
  'retry-queue',
  'Procesa la cola de reintentos de transacciones fallidas de Lemonway',
  '/api/cron/retry-queue',
  '*/5 * * * *', -- Cada 5 minutos
  true
)
ON CONFLICT (name) DO NOTHING;
