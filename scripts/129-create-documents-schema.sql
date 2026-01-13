-- =============================================
-- MÓDULO DE GESTIÓN DOCUMENTAL - SCHEMA
-- =============================================
-- Crea el schema 'documentos' con todas las tablas necesarias
-- para la gestión de tipos de documentos, versiones, plantillas,
-- sesiones de firma y documentos firmados.

-- Crear schema
CREATE SCHEMA IF NOT EXISTS documentos;

-- =============================================
-- 1. TIPOS DE DOCUMENTO
-- =============================================
-- Define categorías de documentos (contrato inversión, términos, etc.)
CREATE TABLE IF NOT EXISTS documentos.document_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Identificador único interno (snake_case)
    name VARCHAR(100) NOT NULL UNIQUE,
    -- Nombre visible para UI
    display_name VARCHAR(255) NOT NULL,
    -- Descripción del tipo de documento
    description TEXT,
    -- Si el documento requiere firma del inversor
    requiere_firma BOOLEAN DEFAULT true,
    -- Si es obligatorio antes de poder invertir
    obligatorio_antes_de_invertir BOOLEAN DEFAULT false,
    -- Si aplica a un proyecto específico o es general
    aplica_a_proyecto BOOLEAN DEFAULT false,
    -- Días de validez del documento firmado (NULL = sin caducidad)
    dias_validez INTEGER,
    -- Orden de presentación en UI
    orden INTEGER DEFAULT 0,
    -- Estado activo/inactivo
    activo BOOLEAN DEFAULT true,
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Cambiado de UUID a TEXT para coincidir con public."User".id
    created_by_admin_id TEXT REFERENCES public."User"(id)
);

-- =============================================
-- 2. VERSIONES DE DOCUMENTO
-- =============================================
-- Cada tipo puede tener múltiples versiones (borradores, publicadas, retiradas)
CREATE TYPE documentos.version_status AS ENUM ('borrador', 'publicado', 'retirado');

CREATE TABLE IF NOT EXISTS documentos.document_version (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Tipo de documento al que pertenece
    document_type_id UUID NOT NULL REFERENCES documentos.document_type(id) ON DELETE CASCADE,
    -- Número de versión (1.0, 1.1, 2.0, etc.)
    version_number VARCHAR(20) NOT NULL,
    -- Estado de la versión
    status documentos.version_status DEFAULT 'borrador',
    -- Contenido HTML de la plantilla (editable solo en borrador)
    contenido_html TEXT NOT NULL,
    -- Variables disponibles en la plantilla (JSON array)
    -- Ejemplo: ["nombre_inversor", "dni", "proyecto_nombre", "importe"]
    variables_disponibles JSONB DEFAULT '[]'::jsonb,
    -- Notas internas sobre cambios en esta versión
    notas_version TEXT,
    -- Fecha de publicación (cuando pasa a estado 'publicado')
    fecha_publicacion TIMESTAMP WITH TIME ZONE,
    -- Fecha de retiro (cuando pasa a estado 'retirado')
    fecha_retiro TIMESTAMP WITH TIME ZONE,
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Cambiado de UUID a TEXT para coincidir con public."User".id
    created_by_admin_id TEXT REFERENCES public."User"(id),
    published_by_admin_id TEXT REFERENCES public."User"(id),
    
    -- Una versión específica por tipo
    UNIQUE(document_type_id, version_number)
);

-- Índice para buscar versión publicada activa de un tipo
CREATE INDEX idx_document_version_active ON documentos.document_version(document_type_id, status) 
    WHERE status = 'publicado';

-- =============================================
-- 3. SESIONES DE FIRMA
-- =============================================
-- Representa una sesión de firma iniciada por un inversor
CREATE TYPE documentos.firma_status AS ENUM ('pendiente', 'otp_enviado', 'firmado', 'cancelado', 'expirado');
CREATE TYPE documentos.otp_method AS ENUM ('sms', 'whatsapp', 'email', 'google_authenticator');
CREATE TYPE documentos.firma_channel AS ENUM ('desktop', 'mobile', 'qr_mobile');

CREATE TABLE IF NOT EXISTS documentos.signature_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Inversor que debe firmar
    inversor_id UUID NOT NULL REFERENCES investors."User"(id) ON DELETE CASCADE,
    -- Versión del documento a firmar
    document_version_id UUID NOT NULL REFERENCES documentos.document_version(id),
    -- Proyecto relacionado (opcional, si aplica_a_proyecto = true)
    proyecto_id UUID,
    -- Inversión relacionada (opcional)
    inversion_id UUID,
    -- Token único para acceso (usado en QR)
    token_firma VARCHAR(64) NOT NULL UNIQUE,
    -- Estado de la sesión
    status documentos.firma_status DEFAULT 'pendiente',
    -- Canal desde donde se inició
    canal_origen documentos.firma_channel DEFAULT 'desktop',
    -- Token QR para firma desde móvil (si aplica)
    qr_token VARCHAR(64) UNIQUE,
    qr_token_expires_at TIMESTAMP WITH TIME ZONE,
    -- OTP
    metodo_otp documentos.otp_method,
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    otp_intentos INTEGER DEFAULT 0,
    otp_destino_mascara VARCHAR(100), -- ej: "***1234" o "j***@email.com"
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    otp_sent_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    -- IP y metadata
    created_from_ip VARCHAR(45),
    signed_from_ip VARCHAR(45),
    user_agent TEXT,
    
    -- Índices para búsquedas frecuentes
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

CREATE INDEX idx_signature_session_inversor ON documentos.signature_session(inversor_id, status);
CREATE INDEX idx_signature_session_token ON documentos.signature_session(token_firma);
CREATE INDEX idx_signature_session_qr ON documentos.signature_session(qr_token) WHERE qr_token IS NOT NULL;

-- =============================================
-- 4. DOCUMENTOS FIRMADOS
-- =============================================
-- Registro inmutable de documentos firmados
CREATE TYPE documentos.signed_status AS ENUM ('vigente', 'caducado', 'revocado', 'reemplazado');

CREATE TABLE IF NOT EXISTS documentos.signed_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Sesión de firma que generó este documento
    signature_session_id UUID NOT NULL REFERENCES documentos.signature_session(id),
    -- Inversor que firmó
    inversor_id UUID NOT NULL REFERENCES investors."User"(id),
    -- Versión exacta del documento firmado
    document_version_id UUID NOT NULL REFERENCES documentos.document_version(id),
    -- Proyecto relacionado (si aplica)
    proyecto_id UUID,
    -- Inversión relacionada (si aplica)
    inversion_id UUID,
    -- Código Seguro de Verificación (único, público)
    csv VARCHAR(32) NOT NULL UNIQUE,
    -- Estado del documento firmado
    status documentos.signed_status DEFAULT 'vigente',
    -- PDF firmado
    pdf_storage_provider VARCHAR(50) DEFAULT 'vercel_blob', -- 'vercel_blob' | 'aws_s3'
    pdf_url TEXT NOT NULL,
    pdf_hash VARCHAR(64) NOT NULL, -- SHA-256 del PDF
    pdf_size_bytes INTEGER,
    -- Contenido HTML renderizado (con variables sustituidas)
    contenido_html_firmado TEXT NOT NULL,
    -- Metadata de firma
    metodo_otp_usado documentos.otp_method NOT NULL,
    otp_destino_mascara VARCHAR(100),
    -- Fechas
    firma_completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_caducidad TIMESTAMP WITH TIME ZONE, -- NULL = sin caducidad
    fecha_revocacion TIMESTAMP WITH TIME ZONE,
    motivo_revocacion TEXT,
    -- IP y metadata
    firma_ip VARCHAR(45),
    firma_user_agent TEXT,
    firma_channel documentos.firma_channel,
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Cambiado de UUID a TEXT para coincidir con public."User".id
    revoked_by_admin_id TEXT REFERENCES public."User"(id)
);

CREATE INDEX idx_signed_document_inversor ON documentos.signed_document(inversor_id, status);
CREATE INDEX idx_signed_document_csv ON documentos.signed_document(csv);
CREATE INDEX idx_signed_document_version ON documentos.signed_document(document_version_id);

-- =============================================
-- 5. CONFIGURACIÓN DEL MÓDULO
-- =============================================
-- Añadir configuraciones a AdminSettings
INSERT INTO public."AdminSettings" (key, value, description, is_secret, created_at, updated_at)
VALUES 
    ('documentos_storage_provider', 'vercel_blob', 'Proveedor de almacenamiento de PDFs: vercel_blob | aws_s3', false, NOW(), NOW()),
    ('documentos_aws_s3_bucket', '', 'Nombre del bucket S3 para almacenamiento de PDFs', false, NOW(), NOW()),
    ('documentos_aws_s3_region', 'eu-west-1', 'Región del bucket S3', false, NOW(), NOW()),
    ('documentos_aws_access_key_id', '', 'AWS Access Key ID para S3', true, NOW(), NOW()),
    ('documentos_aws_secret_access_key', '', 'AWS Secret Access Key para S3', true, NOW(), NOW()),
    ('documentos_qr_token_expiry_minutes', '10', 'Minutos de validez del token QR para firma móvil', false, NOW(), NOW()),
    ('documentos_otp_expiry_minutes', '5', 'Minutos de validez del código OTP', false, NOW(), NOW()),
    ('documentos_max_otp_attempts', '3', 'Máximo de intentos de OTP antes de bloquear sesión', false, NOW(), NOW()),
    ('documentos_session_expiry_minutes', '30', 'Minutos de validez de una sesión de firma', false, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- 6. FUNCIÓN PARA GENERAR CSV
-- =============================================
CREATE OR REPLACE FUNCTION documentos.generate_csv()
RETURNS VARCHAR(32) AS $$
DECLARE
    new_csv VARCHAR(32);
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generar código alfanumérico de 32 caracteres
        new_csv := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 32));
        
        -- Verificar que no existe
        SELECT COUNT(*) INTO exists_count 
        FROM documentos.signed_document 
        WHERE csv = new_csv;
        
        EXIT WHEN exists_count = 0;
    END LOOP;
    
    RETURN new_csv;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. TRIGGER PARA ACTUALIZAR updated_at
-- =============================================
CREATE OR REPLACE FUNCTION documentos.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_type_updated_at
    BEFORE UPDATE ON documentos.document_type
    FOR EACH ROW EXECUTE FUNCTION documentos.update_updated_at();

CREATE TRIGGER trigger_document_version_updated_at
    BEFORE UPDATE ON documentos.document_version
    FOR EACH ROW EXECUTE FUNCTION documentos.update_updated_at();

-- =============================================
-- VERIFICACIÓN
-- =============================================
SELECT 'Schema documentos creado correctamente' AS resultado;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'documentos';
