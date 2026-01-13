-- =====================================================
-- FASE 1: Schema y Tablas para Importación Lemonway
-- =====================================================
-- Descripción: Crea el schema lemonway_temp y todas las tablas
--              necesarias para la importación de transacciones
-- Autor: Sistema URBIX
-- Fecha: 2025-01-08
-- =====================================================

-- 1. Crear schema lemonway_temp
CREATE SCHEMA IF NOT EXISTS lemonway_temp;

-- =====================================================
-- 2. Tabla: import_runs
-- Descripción: Registro de ejecuciones de importación
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.import_runs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
    
    -- Parámetros de importación
    account_id TEXT NOT NULL,
    cuenta_virtual_id TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Resultados
    total_transactions INTEGER DEFAULT 0,
    imported_transactions INTEGER DEFAULT 0,
    failed_transactions INTEGER DEFAULT 0,
    skipped_transactions INTEGER DEFAULT 0,
    
    -- Metadata
    lemonway_api_call_log_id TEXT,
    error_message TEXT,
    error_details JSONB,
    
    -- Auditoría
    created_by TEXT REFERENCES public."User"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para import_runs
CREATE INDEX idx_import_runs_status ON lemonway_temp.import_runs(status);
CREATE INDEX idx_import_runs_account_id ON lemonway_temp.import_runs(account_id);
CREATE INDEX idx_import_runs_cuenta_virtual_id ON lemonway_temp.import_runs(cuenta_virtual_id);
CREATE INDEX idx_import_runs_created_at ON lemonway_temp.import_runs(created_at DESC);
CREATE INDEX idx_import_runs_api_log ON lemonway_temp.import_runs(lemonway_api_call_log_id);

-- =====================================================
-- 3. Tabla: cuentas_virtuales
-- Descripción: Espejo de virtual_accounts con lemonway_account_id
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.cuentas_virtuales (
    id TEXT PRIMARY KEY,
    lemonway_account_id TEXT UNIQUE NOT NULL,
    investor_id TEXT,
    nombre TEXT,
    tipo TEXT,
    estado TEXT,
    saldo_actual DECIMAL(15, 2) DEFAULT 0,
    
    -- Sincronización
    last_synced_at TIMESTAMP WITH TIME ZONE,
    sync_status TEXT CHECK (sync_status IN ('active', 'inactive', 'error')),
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para cuentas_virtuales
CREATE INDEX idx_cuentas_virtuales_lemonway ON lemonway_temp.cuentas_virtuales(lemonway_account_id);
CREATE INDEX idx_cuentas_virtuales_investor ON lemonway_temp.cuentas_virtuales(investor_id);
CREATE INDEX idx_cuentas_virtuales_sync_status ON lemonway_temp.cuentas_virtuales(sync_status);

-- =====================================================
-- 4. Tabla: tipos_operacion_contable
-- Descripción: Catálogo de tipos de operación contable
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.tipos_operacion_contable (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    codigo TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT CHECK (categoria IN ('ingreso', 'egreso', 'transferencia', 'ajuste')),
    
    -- Mapeo Lemonway
    lemonway_transaction_type TEXT,
    lemonway_comment_pattern TEXT,
    
    -- Control
    is_active BOOLEAN DEFAULT true,
    requiere_aprobacion BOOLEAN DEFAULT false,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para tipos_operacion_contable
CREATE INDEX idx_tipos_operacion_codigo ON lemonway_temp.tipos_operacion_contable(codigo);
CREATE INDEX idx_tipos_operacion_categoria ON lemonway_temp.tipos_operacion_contable(categoria);
CREATE INDEX idx_tipos_operacion_active ON lemonway_temp.tipos_operacion_contable(is_active);

-- =====================================================
-- 5. Tabla: movimientos_cuenta
-- Descripción: Transacciones importadas desde Lemonway
-- =====================================================
CREATE TABLE IF NOT EXISTS lemonway_temp.movimientos_cuenta (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Relaciones
    import_run_id TEXT NOT NULL REFERENCES lemonway_temp.import_runs(id) ON DELETE CASCADE,
    cuenta_virtual_id TEXT NOT NULL REFERENCES lemonway_temp.cuentas_virtuales(id),
    tipo_operacion_id TEXT REFERENCES lemonway_temp.tipos_operacion_contable(id),
    
    -- Datos de Lemonway (estructura completa)
    lemonway_transaction_id TEXT UNIQUE NOT NULL,
    lemonway_raw_data JSONB NOT NULL,
    
    -- Campos principales extraídos
    fecha_operacion TIMESTAMP WITH TIME ZONE NOT NULL,
    monto DECIMAL(15, 2) NOT NULL,
    moneda TEXT DEFAULT 'EUR',
    tipo_transaccion TEXT, -- CREDIT o DEBIT
    
    -- Descripción y detalles
    descripcion TEXT,
    comentario TEXT,
    referencia_externa TEXT,
    
    -- Información adicional de Lemonway
    sender TEXT,
    receiver TEXT,
    commission DECIMAL(15, 2),
    status INTEGER,
    payment_method TEXT,
    card_type TEXT,
    card_number TEXT,
    psp_name TEXT,
    
    -- Saldos (pendiente de cálculo)
    saldo_previo DECIMAL(15, 2),
    saldo_posterior DECIMAL(15, 2),
    
    -- Estado de procesamiento
    procesado BOOLEAN DEFAULT false,
    procesado_at TIMESTAMP WITH TIME ZONE,
    error_procesamiento TEXT,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para movimientos_cuenta
CREATE INDEX idx_movimientos_import_run ON lemonway_temp.movimientos_cuenta(import_run_id);
CREATE INDEX idx_movimientos_cuenta_virtual ON lemonway_temp.movimientos_cuenta(cuenta_virtual_id);
CREATE INDEX idx_movimientos_tipo_operacion ON lemonway_temp.movimientos_cuenta(tipo_operacion_id);
CREATE INDEX idx_movimientos_lemonway_tx ON lemonway_temp.movimientos_cuenta(lemonway_transaction_id);
CREATE INDEX idx_movimientos_fecha ON lemonway_temp.movimientos_cuenta(fecha_operacion DESC);
CREATE INDEX idx_movimientos_procesado ON lemonway_temp.movimientos_cuenta(procesado);
CREATE INDEX idx_movimientos_tipo_transaccion ON lemonway_temp.movimientos_cuenta(tipo_transaccion);

-- =====================================================
-- 6. Insertar tipos de operación por defecto
-- =====================================================
INSERT INTO lemonway_temp.tipos_operacion_contable (codigo, nombre, descripcion, categoria, lemonway_transaction_type) VALUES
('TRX_PENDING', 'Transacción Pendiente', 'Transacción sin categorizar', 'transferencia', NULL),
('CREDIT_IN', 'Ingreso por Crédito', 'Recepción de fondos', 'ingreso', 'CREDIT'),
('DEBIT_OUT', 'Egreso por Débito', 'Salida de fondos', 'egreso', 'DEBIT'),
('TRANSFER_IN', 'Transferencia Recibida', 'Transferencia entrante', 'transferencia', 'CREDIT'),
('TRANSFER_OUT', 'Transferencia Enviada', 'Transferencia saliente', 'transferencia', 'DEBIT')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- 7. Trigger para actualizar updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION lemonway_temp.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_import_runs_updated_at BEFORE UPDATE ON lemonway_temp.import_runs
    FOR EACH ROW EXECUTE FUNCTION lemonway_temp.update_updated_at_column();

CREATE TRIGGER update_cuentas_virtuales_updated_at BEFORE UPDATE ON lemonway_temp.cuentas_virtuales
    FOR EACH ROW EXECUTE FUNCTION lemonway_temp.update_updated_at_column();

CREATE TRIGGER update_tipos_operacion_updated_at BEFORE UPDATE ON lemonway_temp.tipos_operacion_contable
    FOR EACH ROW EXECUTE FUNCTION lemonway_temp.update_updated_at_column();

CREATE TRIGGER update_movimientos_cuenta_updated_at BEFORE UPDATE ON lemonway_temp.movimientos_cuenta
    FOR EACH ROW EXECUTE FUNCTION lemonway_temp.update_updated_at_column();

-- =====================================================
-- 8. Verificación
-- =====================================================
SELECT 'Schema lemonway_temp creado exitosamente' as status;
SELECT table_name, 
       pg_size_pretty(pg_total_relation_size('lemonway_temp.' || table_name)) as size
FROM information_schema.tables 
WHERE table_schema = 'lemonway_temp'
ORDER BY table_name;
