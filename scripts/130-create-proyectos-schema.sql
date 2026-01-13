-- =============================================
-- MÓDULO DE PROYECTOS - SCHEMA
-- =============================================
-- Crea el schema 'proyectos' con las tablas necesarias
-- para la gestión de proyectos de inversión.

-- Crear schema
CREATE SCHEMA IF NOT EXISTS proyectos;

-- =============================================
-- 1. ESTADOS DE PROYECTO
-- =============================================
CREATE TYPE proyectos.proyecto_status AS ENUM (
    'borrador',           -- En preparación
    'en_revision',        -- Pendiente de aprobación interna
    'publicado',          -- Visible para inversores, aceptando inversiones
    'financiado',         -- Objetivo alcanzado
    'cerrado',            -- Campaña finalizada
    'cancelado'           -- Cancelado antes de completar
);

-- =============================================
-- 2. TABLA DE PROYECTOS
-- =============================================
CREATE TABLE IF NOT EXISTS proyectos.proyecto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Identificador público (slug URL-friendly)
    slug VARCHAR(100) NOT NULL UNIQUE,
    -- Información básica
    nombre VARCHAR(255) NOT NULL,
    descripcion_corta VARCHAR(500),
    descripcion_larga TEXT,
    -- Imágenes
    imagen_principal_url TEXT,
    imagenes_galeria JSONB DEFAULT '[]'::jsonb,
    -- Datos financieros
    objetivo_minimo DECIMAL(15,2) NOT NULL,
    objetivo_maximo DECIMAL(15,2),
    inversion_minima DECIMAL(15,2) DEFAULT 500.00,
    inversion_maxima DECIMAL(15,2),
    -- Rentabilidad
    rentabilidad_esperada DECIMAL(5,2), -- Porcentaje
    plazo_meses INTEGER,
    tipo_rentabilidad VARCHAR(50), -- 'fija', 'variable', 'participativa'
    -- Fechas de campaña
    fecha_inicio_inversion TIMESTAMP WITH TIME ZONE,
    fecha_fin_inversion TIMESTAMP WITH TIME ZONE,
    -- Estado
    status proyectos.proyecto_status DEFAULT 'borrador',
    -- Promotor/Empresa
    promotor_nombre VARCHAR(255),
    promotor_cif VARCHAR(20),
    promotor_descripcion TEXT,
    -- Ubicación (si aplica)
    ubicacion_direccion TEXT,
    ubicacion_ciudad VARCHAR(100),
    ubicacion_provincia VARCHAR(100),
    ubicacion_pais VARCHAR(100) DEFAULT 'España',
    ubicacion_coordenadas POINT,
    -- Documentación del proyecto
    documentos_adjuntos JSONB DEFAULT '[]'::jsonb,
    -- SEO y metadata
    meta_title VARCHAR(255),
    meta_description VARCHAR(500),
    -- Configuración
    permite_reinversion BOOLEAN DEFAULT false,
    visible_en_listado BOOLEAN DEFAULT true,
    destacado BOOLEAN DEFAULT false,
    orden_destacado INTEGER DEFAULT 0,
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    -- Cambiado de UUID a TEXT para coincidir con public."User".id
    created_by_admin_id TEXT REFERENCES public."User"(id),
    published_by_admin_id TEXT REFERENCES public."User"(id)
);

-- Índices
CREATE INDEX idx_proyecto_status ON proyectos.proyecto(status);
CREATE INDEX idx_proyecto_slug ON proyectos.proyecto(slug);
CREATE INDEX idx_proyecto_fechas ON proyectos.proyecto(fecha_inicio_inversion, fecha_fin_inversion);
CREATE INDEX idx_proyecto_destacado ON proyectos.proyecto(destacado, orden_destacado) WHERE destacado = true;

-- =============================================
-- 3. ACTUALIZACIONES DE PROYECTO
-- =============================================
-- Comunicaciones/noticias sobre el proyecto
CREATE TABLE IF NOT EXISTS proyectos.proyecto_update (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proyecto_id UUID NOT NULL REFERENCES proyectos.proyecto(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    contenido TEXT NOT NULL,
    -- Visibilidad
    visible_para_inversores BOOLEAN DEFAULT true,
    visible_para_publico BOOLEAN DEFAULT false,
    -- Notificaciones
    enviar_notificacion BOOLEAN DEFAULT false,
    notificacion_enviada_at TIMESTAMP WITH TIME ZONE,
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Cambiado de UUID a TEXT para coincidir con public."User".id
    created_by_admin_id TEXT REFERENCES public."User"(id)
);

CREATE INDEX idx_proyecto_update_proyecto ON proyectos.proyecto_update(proyecto_id, created_at DESC);

-- =============================================
-- 4. TRIGGER PARA ACTUALIZAR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION proyectos.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_proyecto_updated_at
    BEFORE UPDATE ON proyectos.proyecto
    FOR EACH ROW EXECUTE FUNCTION proyectos.update_updated_at();

CREATE TRIGGER trigger_proyecto_update_updated_at
    BEFORE UPDATE ON proyectos.proyecto_update
    FOR EACH ROW EXECUTE FUNCTION proyectos.update_updated_at();

-- =============================================
-- VERIFICACIÓN
-- =============================================
SELECT 'Schema proyectos creado correctamente' AS resultado;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'proyectos';
