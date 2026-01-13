-- =============================================
-- MÓDULO DE INVERSIONES - SCHEMA
-- =============================================
-- Crea el schema 'inversiones' con las tablas necesarias
-- para la gestión de inversiones de los inversores.

-- Crear schema
CREATE SCHEMA IF NOT EXISTS inversiones;

-- =============================================
-- 1. ESTADOS DE INVERSIÓN
-- =============================================
CREATE TYPE inversiones.inversion_status AS ENUM (
    'pendiente_documentos',   -- Faltan documentos por firmar
    'pendiente_pago',         -- Documentos firmados, esperando pago
    'pago_procesando',        -- Pago en proceso
    'confirmada',             -- Inversión confirmada y activa
    'cancelada',              -- Cancelada por el inversor
    'rechazada',              -- Rechazada por compliance
    'reembolsada'             -- Dinero devuelto
);

-- =============================================
-- 2. TABLA DE INVERSIONES
-- =============================================
CREATE TABLE IF NOT EXISTS inversiones.inversion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Relaciones principales
    inversor_id UUID NOT NULL REFERENCES investors."User"(id) ON DELETE RESTRICT,
    proyecto_id UUID NOT NULL REFERENCES proyectos.proyecto(id) ON DELETE RESTRICT,
    -- Importes
    importe DECIMAL(15,2) NOT NULL,
    importe_comision DECIMAL(15,2) DEFAULT 0,
    importe_total DECIMAL(15,2) GENERATED ALWAYS AS (importe + importe_comision) STORED,
    -- Estado
    status inversiones.inversion_status DEFAULT 'pendiente_documentos',
    -- Referencia de pago
    referencia_pago VARCHAR(100) UNIQUE,
    metodo_pago VARCHAR(50), -- 'transferencia', 'tarjeta', 'bizum'
    -- Fechas
    fecha_compromiso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fecha_pago TIMESTAMP WITH TIME ZONE,
    fecha_confirmacion TIMESTAMP WITH TIME ZONE,
    fecha_cancelacion TIMESTAMP WITH TIME ZONE,
    -- Motivos (si aplica)
    motivo_cancelacion TEXT,
    motivo_rechazo TEXT,
    -- Datos del pago
    pago_referencia_externa VARCHAR(255),
    pago_metadata JSONB,
    -- Canal de origen
    canal_origen VARCHAR(50) DEFAULT 'web', -- 'web', 'mobile', 'api'
    -- IP y metadata
    created_from_ip VARCHAR(45),
    user_agent TEXT,
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Cambiado de UUID a TEXT para coincidir con public."User".id
    confirmed_by_admin_id TEXT REFERENCES public."User"(id),
    cancelled_by_admin_id TEXT REFERENCES public."User"(id),
    
    -- Validaciones
    CONSTRAINT valid_importe CHECK (importe > 0),
    CONSTRAINT valid_importe_comision CHECK (importe_comision >= 0)
);

-- Índices
CREATE INDEX idx_inversion_inversor ON inversiones.inversion(inversor_id, status);
CREATE INDEX idx_inversion_proyecto ON inversiones.inversion(proyecto_id, status);
CREATE INDEX idx_inversion_status ON inversiones.inversion(status);
CREATE INDEX idx_inversion_fecha ON inversiones.inversion(fecha_compromiso DESC);
CREATE INDEX idx_inversion_referencia ON inversiones.inversion(referencia_pago);

-- =============================================
-- 3. HISTORIAL DE ESTADOS
-- =============================================
-- Registro de cambios de estado para auditoría
CREATE TABLE IF NOT EXISTS inversiones.inversion_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inversion_id UUID NOT NULL REFERENCES inversiones.inversion(id) ON DELETE CASCADE,
    status_anterior inversiones.inversion_status,
    status_nuevo inversiones.inversion_status NOT NULL,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Cambiado de UUID a TEXT para coincidir con public."User".id
    created_by_admin_id TEXT REFERENCES public."User"(id),
    created_from_ip VARCHAR(45)
);

CREATE INDEX idx_inversion_history ON inversiones.inversion_status_history(inversion_id, created_at DESC);

-- =============================================
-- 4. RESUMEN POR PROYECTO (Vista materializada)
-- =============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS inversiones.resumen_proyecto AS
SELECT 
    p.id AS proyecto_id,
    p.nombre AS proyecto_nombre,
    p.objetivo_minimo,
    p.objetivo_maximo,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'confirmada') AS num_inversiones,
    COUNT(DISTINCT i.inversor_id) FILTER (WHERE i.status = 'confirmada') AS num_inversores,
    COALESCE(SUM(i.importe) FILTER (WHERE i.status = 'confirmada'), 0) AS importe_recaudado,
    COALESCE(SUM(i.importe_total) FILTER (WHERE i.status = 'confirmada'), 0) AS importe_total_recaudado,
    CASE 
        WHEN p.objetivo_minimo > 0 
        THEN ROUND((COALESCE(SUM(i.importe) FILTER (WHERE i.status = 'confirmada'), 0) / p.objetivo_minimo) * 100, 2)
        ELSE 0 
    END AS porcentaje_objetivo
FROM proyectos.proyecto p
LEFT JOIN inversiones.inversion i ON i.proyecto_id = p.id
GROUP BY p.id, p.nombre, p.objetivo_minimo, p.objetivo_maximo;

CREATE UNIQUE INDEX idx_resumen_proyecto ON inversiones.resumen_proyecto(proyecto_id);

-- =============================================
-- 5. FUNCIÓN PARA REFRESCAR RESUMEN
-- =============================================
CREATE OR REPLACE FUNCTION inversiones.refresh_resumen_proyecto()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY inversiones.resumen_proyecto;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para refrescar automáticamente (en producción considerar hacer esto async)
CREATE TRIGGER trigger_refresh_resumen
    AFTER INSERT OR UPDATE OR DELETE ON inversiones.inversion
    FOR EACH STATEMENT EXECUTE FUNCTION inversiones.refresh_resumen_proyecto();

-- =============================================
-- 6. TRIGGER PARA HISTORIAL DE ESTADOS
-- =============================================
CREATE OR REPLACE FUNCTION inversiones.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO inversiones.inversion_status_history (
            inversion_id, 
            status_anterior, 
            status_nuevo
        ) VALUES (
            NEW.id, 
            OLD.status, 
            NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inversion_status_history
    AFTER UPDATE ON inversiones.inversion
    FOR EACH ROW EXECUTE FUNCTION inversiones.log_status_change();

-- =============================================
-- 7. TRIGGER PARA ACTUALIZAR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION inversiones.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inversion_updated_at
    BEFORE UPDATE ON inversiones.inversion
    FOR EACH ROW EXECUTE FUNCTION inversiones.update_updated_at();

-- =============================================
-- 8. AÑADIR FKs EN DOCUMENTOS
-- =============================================
-- Añadir las FKs que faltaban en el schema de documentos
ALTER TABLE documentos.signature_session 
    ADD CONSTRAINT fk_signature_session_proyecto 
    FOREIGN KEY (proyecto_id) REFERENCES proyectos.proyecto(id);

ALTER TABLE documentos.signature_session 
    ADD CONSTRAINT fk_signature_session_inversion 
    FOREIGN KEY (inversion_id) REFERENCES inversiones.inversion(id);

ALTER TABLE documentos.signed_document 
    ADD CONSTRAINT fk_signed_document_proyecto 
    FOREIGN KEY (proyecto_id) REFERENCES proyectos.proyecto(id);

ALTER TABLE documentos.signed_document 
    ADD CONSTRAINT fk_signed_document_inversion 
    FOREIGN KEY (inversion_id) REFERENCES inversiones.inversion(id);

-- =============================================
-- VERIFICACIÓN
-- =============================================
SELECT 'Schema inversiones creado correctamente' AS resultado;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'inversiones';

-- Mostrar resumen de todos los schemas creados
SELECT 
    table_schema,
    COUNT(*) AS num_tablas
FROM information_schema.tables 
WHERE table_schema IN ('documentos', 'proyectos', 'inversiones')
GROUP BY table_schema
ORDER BY table_schema;
