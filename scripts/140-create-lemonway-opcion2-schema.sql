-- =====================================================
-- FASE 1 OPCIÓN 2: Schema y Tablas para Admin Dashboard
-- =====================================================
-- Descripción: Crea las tablas necesarias para
--              la OPCIÓN 2 - Panel Admin unificado Lemonway
-- Autor: Sistema URBIX
-- Fecha: 2026-01-12
-- =====================================================

-- =====================================================
-- 1. Tabla: lemonway_custom_queries (Queries Personalizadas)
-- Descripción: Almacena queries reutilizables
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_custom_queries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Identificación
    name VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) UNIQUE,
    
    -- Configuración
    endpoint TEXT NOT NULL,
    http_method TEXT NOT NULL CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    request_template JSONB,
    expected_response_schema JSONB,
    
    -- Validación
    requires_sandbox_approval BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_by TEXT REFERENCES public."User"(id),
    updated_by TEXT REFERENCES public."User"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_queries_slug ON lemonway_temp.lemonway_custom_queries(slug);
CREATE INDEX idx_custom_queries_active ON lemonway_temp.lemonway_custom_queries(is_active);

-- =====================================================
-- 2. Tabla: lemonway_operation_types (Tipos de Operación)
-- Descripción: Categorías de operaciones (transferencias, pagos, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_operation_types (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Identificación
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Configuración
    default_priority TEXT NOT NULL CHECK (default_priority IN ('URGENT', 'NORMAL')) DEFAULT 'NORMAL',
    auto_approve BOOLEAN DEFAULT false,
    requires_notification BOOLEAN DEFAULT true,
    
    -- Mapeo a Lemonway
    lemonway_operation_code VARCHAR(50),
    
    -- Estados
    is_active BOOLEAN DEFAULT true,
    order_display INTEGER DEFAULT 0,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_operation_types_active ON lemonway_temp.lemonway_operation_types(is_active);

-- =====================================================
-- 3. Tabla: lemonway_request_queue (Cola FIFO Dual)
-- Descripción: Cola de solicitudes con priorización URGENTE/NORMAL
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_request_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Priorización FIFO Dual
    -- Removida columna GENERATED ALWAYS AS ROW_NUMBER (no soportada en PostgreSQL)
    -- La posición en cola se calcula dinámicamente en queries
    priority TEXT NOT NULL CHECK (priority IN ('URGENT', 'NORMAL')) DEFAULT 'NORMAL',
    
    -- Solicitud
    custom_query_id TEXT REFERENCES lemonway_temp.lemonway_custom_queries(id) ON DELETE SET NULL,
    operation_type_id TEXT REFERENCES lemonway_temp.lemonway_operation_types(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    http_method TEXT NOT NULL CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
    request_payload JSONB,
    request_headers JSONB,
    
    -- Contexto
    wallet_id TEXT,
    account_id TEXT,
    related_task_id TEXT,
    related_movement_id TEXT,
    
    -- Estado
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'deferred')) DEFAULT 'pending',
    
    -- Respuesta
    response_payload JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    
    -- Manejo de errores
    error_message TEXT,
    error_code VARCHAR(50),
    error_details JSONB,
    
    -- Reintentos
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    retry_backoff_multiplier NUMERIC(3, 1) DEFAULT 2.0,
    last_error_at TIMESTAMP WITH TIME ZONE,
    
    -- Sandbox
    sandbox_mode BOOLEAN DEFAULT false,
    sandbox_result_snapshot JSONB,
    
    -- Auditoría
    created_by TEXT REFERENCES public."User"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_queue_priority_status ON lemonway_temp.lemonway_request_queue(priority, status, created_at);
CREATE INDEX idx_queue_status ON lemonway_temp.lemonway_request_queue(status);
CREATE INDEX idx_queue_created ON lemonway_temp.lemonway_request_queue(created_at DESC);
CREATE INDEX idx_queue_next_retry ON lemonway_temp.lemonway_request_queue(next_retry_at) WHERE status = 'failed';

-- =====================================================
-- 4. Tabla: lemonway_sandbox_history (Historial de Sandbox)
-- Descripción: Snapshots de ejecuciones en sandbox
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_sandbox_history (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Referencia
    queue_entry_id TEXT REFERENCES lemonway_temp.lemonway_request_queue(id) ON DELETE CASCADE,
    
    -- Detalles sandbox
    request_snapshot JSONB NOT NULL,
    response_snapshot JSONB,
    execution_time_ms INTEGER,
    
    -- Comparación
    differences_from_production JSONB,
    warning_flags JSONB,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    
    -- Auditoría
    created_by TEXT REFERENCES public."User"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sandbox_history_queue ON lemonway_temp.lemonway_sandbox_history(queue_entry_id);

-- =====================================================
-- 5. Tabla: lemonway_field_mapping_rules (Mapeo de Campos)
-- Descripción: Reglas de transformación de datos
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_field_mapping_rules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Identificación
    name VARCHAR(255) NOT NULL,
    source_field VARCHAR(255) NOT NULL,
    target_field VARCHAR(255) NOT NULL,
    
    -- Transformación
    transformation_type VARCHAR(50) CHECK (transformation_type IN ('identity', 'format', 'enum_map', 'calculation')),
    transformation_config JSONB,
    
    -- Validación
    validation_rule JSONB,
    is_required BOOLEAN DEFAULT false,
    
    -- Estados
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 6. Tabla: lemonway_api_call_versions (Versionado de Llamadas)
-- Descripción: Historial de versiones de llamadas API
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_api_call_versions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Referencia
    queue_entry_id TEXT REFERENCES lemonway_temp.lemonway_request_queue(id) ON DELETE CASCADE,
    
    -- Versión
    version_number INTEGER NOT NULL,
    version_label VARCHAR(50),
    
    -- Cambios
    request_before JSONB,
    request_after JSONB,
    response_before JSONB,
    response_after JSONB,
    
    -- Auditoría
    changed_by TEXT REFERENCES public."User"(id),
    change_reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_versions_queue ON lemonway_temp.lemonway_api_call_versions(queue_entry_id);

-- =====================================================
-- 7. Tabla: lemonway_webhook_simulations (Simulaciones de Webhooks)
-- Descripción: Historial de webhooks simulados para testing
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_webhook_simulations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Evento a simular
    webhook_event_type VARCHAR(100) NOT NULL,
    webhook_payload JSONB NOT NULL,
    
    -- Ejecución
    simulated_response JSONB,
    execution_time_ms INTEGER,
    
    -- Resultado
    status VARCHAR(50) CHECK (status IN ('success', 'failed', 'partial')),
    error_details TEXT,
    
    -- Auditoría
    created_by TEXT REFERENCES public."User"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. Tabla: lemonway_rate_limit_tracking (Rate Limiting)
-- Descripción: Seguimiento de límites de velocidad
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_rate_limit_tracking (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Límites
    operation_type_id TEXT REFERENCES lemonway_temp.lemonway_operation_types(id),
    calls_in_window INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    window_end TIMESTAMP WITH TIME ZONE,
    
    -- Configuración
    max_calls_per_window INTEGER,
    window_duration_seconds INTEGER,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
SELECT 'Schema lemonway_temp OPCIÓN 2 creado correctamente' AS resultado;
