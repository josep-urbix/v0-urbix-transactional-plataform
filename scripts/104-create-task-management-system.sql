-- =====================================================
-- URBIX INTEGRATIONS - TASK MANAGEMENT SYSTEM (FIXED)
-- Schema: tasks
-- Descripción: Sistema completo de gestión de tareas
-- =====================================================

-- Crear schema
CREATE SCHEMA IF NOT EXISTS tasks;

-- =====================================================
-- 1. TIPOS ENUM
-- =====================================================

DO $$ BEGIN
  CREATE TYPE tasks.task_type_enum AS ENUM (
    'VINCULACION_PENDIENTE',
    'VINCULACION_ROTA',
    'CAMBIO_STATUS_WALLET',
    'CUENTA_BLOQUEADA',
    'VERIFICACION_MANUAL',
    'SALDO_INCONSISTENTE',
    'MANUAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tasks.task_priority_enum AS ENUM (
    'BAJA',
    'MEDIA',
    'ALTA',
    'CRITICA'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tasks.task_status_enum AS ENUM (
    'PENDIENTE',
    'EN_PROGRESO',
    'COMPLETADA',
    'CANCELADA'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tasks.process_type_enum AS ENUM (
    'VINCULACION_WALLETS',
    'REVISION_KYC',
    'VERIFICACION_SALDOS',
    'AUDITORIA_TRANSACCIONES',
    'GESTION_USUARIOS',
    'SOPORTE_TECNICO',
    'OTRO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. TABLA PRINCIPAL DE TAREAS (CON PARTICIONAMIENTO)
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks.tasks (
  id UUID DEFAULT gen_random_uuid(),
  tipo tasks.task_type_enum NOT NULL,
  proceso tasks.process_type_enum,
  prioridad tasks.task_priority_enum NOT NULL DEFAULT 'MEDIA',
  estado tasks.task_status_enum NOT NULL DEFAULT 'PENDIENTE',
  
  -- Vinculaciones
  cuenta_virtual_id UUID,
  payment_account_id INTEGER,
  investor_id UUID,
  transaction_id TEXT,
  objeto_tipo TEXT,
  objeto_id TEXT,
  
  -- Asignación
  asignado_a TEXT,
  creado_por TEXT NOT NULL,
  
  -- Contenido
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  contexto JSONB DEFAULT '{}',
  
  -- Fechas
  fecha_creacion TIMESTAMP DEFAULT NOW() NOT NULL,
  fecha_asignacion TIMESTAMP,
  fecha_vencimiento TIMESTAMP,
  fecha_completada TIMESTAMP,
  fecha_cancelada TIMESTAMP,
  
  -- Notas y resultados
  notas TEXT,
  resultado JSONB DEFAULT '{}',
  
  -- Escalado
  escalada BOOLEAN DEFAULT false,
  fecha_escalado TIMESTAMP,
  escalado_a TEXT,
  nivel_escalado INTEGER DEFAULT 0,
  
  -- Partición por mes
  mes_creacion DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW())::DATE,
  
  PRIMARY KEY (id, mes_creacion)
) PARTITION BY RANGE (mes_creacion);

-- Crear particiones para 2026
DO $$
DECLARE
  month_start DATE;
  month_end DATE;
  partition_name TEXT;
BEGIN
  FOR i IN 1..6 LOOP
    month_start := ('2026-' || LPAD(i::TEXT, 2, '0') || '-01')::DATE;
    month_end := month_start + INTERVAL '1 month';
    partition_name := 'tasks_2026_' || LPAD(i::TEXT, 2, '0');
    
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'tasks' AND tablename = partition_name) THEN
      EXECUTE format(
        'CREATE TABLE tasks.%I PARTITION OF tasks.tasks FOR VALUES FROM (%L) TO (%L)',
        partition_name, month_start, month_end
      );
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 3. TABLAS SECUNDARIAS
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  comentario TEXT NOT NULL,
  adjuntos JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks.task_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  user_id TEXT,
  accion TEXT NOT NULL,
  campo_cambiado TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  contexto JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks.task_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  nivel INTEGER NOT NULL,
  escalado_desde TEXT,
  escalado_a TEXT,
  motivo TEXT NOT NULL,
  automatico BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks.task_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tasks.task_type_enum NOT NULL,
  prioridad tasks.task_priority_enum NOT NULL,
  horas_limite INTEGER NOT NULL,
  horas_escalado INTEGER,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP,
  UNIQUE(tipo, prioridad)
);

CREATE TABLE IF NOT EXISTS tasks.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  tipo tasks.task_type_enum NOT NULL,
  proceso tasks.process_type_enum,
  prioridad tasks.task_priority_enum NOT NULL,
  titulo_template TEXT NOT NULL,
  descripcion_template TEXT NOT NULL,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP
);

-- =====================================================
-- 4. MODIFICAR TABLAS EXISTENTES
-- =====================================================

-- User: añadir is_supervisor
ALTER TABLE public."User" 
ADD COLUMN IF NOT EXISTS is_supervisor BOOLEAN DEFAULT false;

-- cuentas_virtuales: añadir campos de vinculación
ALTER TABLE virtual_accounts.cuentas_virtuales
ADD COLUMN IF NOT EXISTS lemonway_account_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS lemonway_internal_id INTEGER,
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS vinculacion_timestamp TIMESTAMP,
ADD COLUMN IF NOT EXISTS vinculacion_bloqueada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS motivo_bloqueo TEXT;

-- payment_accounts: añadir cuenta_virtual_id
ALTER TABLE payments.payment_accounts
ADD COLUMN IF NOT EXISTS cuenta_virtual_id UUID;

-- =====================================================
-- 5. ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tasks_estado ON tasks.tasks(estado) WHERE estado IN ('PENDIENTE', 'EN_PROGRESO');
CREATE INDEX IF NOT EXISTS idx_tasks_asignado ON tasks.tasks(asignado_a) WHERE asignado_a IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_prioridad ON tasks.tasks(prioridad, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_cuenta_virtual ON tasks.tasks(cuenta_virtual_id) WHERE cuenta_virtual_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_payment_account ON tasks.tasks(payment_account_id) WHERE payment_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON tasks.task_comments(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_audit_task ON tasks.task_audit(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_escalations_task ON tasks.task_escalations(task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cuentas_virtuales_lemonway_account 
  ON virtual_accounts.cuentas_virtuales(lemonway_account_id) 
  WHERE lemonway_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_accounts_cuenta_virtual 
  ON payments.payment_accounts(cuenta_virtual_id) 
  WHERE cuenta_virtual_id IS NOT NULL;

-- =====================================================
-- 6. DATOS INICIALES
-- =====================================================

-- Configuración SLA
INSERT INTO tasks.task_sla_config (tipo, prioridad, horas_limite, horas_escalado)
SELECT tipo::tasks.task_type_enum, prioridad::tasks.task_priority_enum, horas_limite, horas_escalado
FROM (VALUES
  ('VINCULACION_ROTA', 'CRITICA', 4, 2),
  ('CAMBIO_STATUS_WALLET', 'CRITICA', 4, 2),
  ('CUENTA_BLOQUEADA', 'CRITICA', 4, 2),
  ('VINCULACION_PENDIENTE', 'MEDIA', 72, 48),
  ('VERIFICACION_MANUAL', 'BAJA', 168, NULL),
  ('MANUAL', 'CRITICA', 4, 2),
  ('MANUAL', 'ALTA', 24, 12),
  ('MANUAL', 'MEDIA', 72, 48)
) AS t(tipo, prioridad, horas_limite, horas_escalado)
WHERE NOT EXISTS (
  SELECT 1 FROM tasks.task_sla_config c
  WHERE c.tipo = t.tipo::tasks.task_type_enum 
  AND c.prioridad = t.prioridad::tasks.task_priority_enum
);

-- Plantillas
INSERT INTO tasks.task_templates (nombre, tipo, proceso, prioridad, titulo_template, descripcion_template)
SELECT * FROM (VALUES
  ('vincular_wallet_nuevo', 'VINCULACION_PENDIENTE'::tasks.task_type_enum, 'VINCULACION_WALLETS'::tasks.process_type_enum, 'MEDIA'::tasks.task_priority_enum, 'Vincular wallet {{account_id}}', 'Vincular wallet status 6 a cuenta virtual'),
  ('revisar_cambio_status', 'CAMBIO_STATUS_WALLET'::tasks.task_type_enum, 'VINCULACION_WALLETS'::tasks.process_type_enum, 'ALTA'::tasks.task_priority_enum, 'Cambio status wallet {{account_id}}', 'Revisar cambio de status'),
  ('cuenta_bloqueada', 'CUENTA_BLOQUEADA'::tasks.task_type_enum, 'VINCULACION_WALLETS'::tasks.process_type_enum, 'CRITICA'::tasks.task_priority_enum, 'Cuenta bloqueada', 'Cuenta virtual bloqueada por anomalía')
) AS t(nombre, tipo, proceso, prioridad, titulo_template, descripcion_template)
WHERE NOT EXISTS (SELECT 1 FROM tasks.task_templates WHERE task_templates.nombre = t.nombre);

-- =====================================================
-- 7. PERMISOS
-- =====================================================

-- Añadir campo name requerido en Permission y displayName en Role
INSERT INTO public."Permission" (name, resource, action, description)
SELECT * FROM (VALUES
  ('tasks:view', 'TASKS', 'VIEW', 'Ver tareas'),
  ('tasks:create', 'TASKS', 'CREATE', 'Crear tareas'),
  ('tasks:complete', 'TASKS', 'COMPLETE', 'Completar tareas'),
  ('tasks:assign', 'TASKS', 'ASSIGN', 'Asignar tareas'),
  ('virtual_accounts:unblock', 'VIRTUAL_ACCOUNTS', 'UNBLOCK', 'Desbloquear cuentas virtuales')
) AS t(name, resource, action, description)
WHERE NOT EXISTS (
  SELECT 1 FROM public."Permission" p 
  WHERE p.resource = t.resource AND p.action = t.action
);

-- Rol Supervisor con displayName
INSERT INTO public."Role" (name, "displayName", description)
SELECT 'Supervisor', 'Supervisor', 'Supervisor de tareas'
WHERE NOT EXISTS (SELECT 1 FROM public."Role" WHERE name = 'Supervisor');

COMMENT ON SCHEMA tasks IS 'Sistema de gestión de tareas para operaciones';
