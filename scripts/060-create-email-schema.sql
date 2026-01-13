-- =====================================================
-- MÓDULO DE EMAILS TRANSACCIONALES
-- Schema: emails
-- =====================================================

-- Crear schema dedicado para emails
CREATE SCHEMA IF NOT EXISTS emails;

-- =====================================================
-- TABLA: email_templates
-- Plantillas de email reutilizables con variables
-- =====================================================
CREATE TABLE IF NOT EXISTS emails.email_templates (
    id SERIAL PRIMARY KEY,
    
    -- Identificación
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Configuración del remitente
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    reply_to VARCHAR(255),
    
    -- Contenido
    subject VARCHAR(500) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Variables disponibles (JSON array de strings)
    variables JSONB DEFAULT '[]'::jsonb,
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Índices para email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON emails.email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON emails.email_templates(is_active);

-- =====================================================
-- TABLA: email_sends
-- Registro de todos los emails enviados
-- =====================================================
CREATE TABLE IF NOT EXISTS emails.email_sends (
    id SERIAL PRIMARY KEY,
    
    -- Referencia al template (opcional, puede ser email ad-hoc)
    template_id INTEGER REFERENCES emails.email_templates(id) ON DELETE SET NULL,
    template_slug VARCHAR(100),
    
    -- Destinatario
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    
    -- Remitente usado
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    reply_to VARCHAR(255),
    
    -- Contenido enviado (snapshot)
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    
    -- Variables utilizadas
    variables_used JSONB DEFAULT '{}'::jsonb,
    
    -- Estado del envío
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Valores: pending, sending, sent, failed, bounced, opened, clicked
    
    -- Respuesta de Gmail API
    gmail_message_id VARCHAR(255),
    gmail_thread_id VARCHAR(255),
    
    -- Error si falló
    error_message TEXT,
    error_code VARCHAR(100),
    
    -- Tracking
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata adicional
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    
    -- IP y User Agent (para tracking)
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Índices para email_sends
CREATE INDEX IF NOT EXISTS idx_email_sends_template_id ON emails.email_sends(template_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_template_slug ON emails.email_sends(template_slug);
CREATE INDEX IF NOT EXISTS idx_email_sends_to_email ON emails.email_sends(to_email);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON emails.email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_created_at ON emails.email_sends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sends_gmail_message_id ON emails.email_sends(gmail_message_id);

-- =====================================================
-- TABLA: email_config
-- Configuración global del módulo de emails
-- =====================================================
CREATE TABLE IF NOT EXISTS emails.email_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    is_secret BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar configuraciones por defecto
INSERT INTO emails.email_config (key, value, description, is_secret) VALUES
    ('default_from_email', 'noreply@urbix.es', 'Email remitente por defecto', false),
    ('default_from_name', 'Urbix', 'Nombre remitente por defecto', false),
    ('service_account_email', '', 'Email de la Service Account de Google', false),
    ('delegated_user_email', '', 'Email del usuario a impersonar (debe ser de tu dominio)', false),
    ('rate_limit_per_minute', '60', 'Límite de emails por minuto', false),
    ('rate_limit_per_day', '2000', 'Límite de emails por día', false),
    ('tracking_enabled', 'true', 'Habilitar tracking de apertura/clicks', false)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION emails.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON emails.email_templates;
CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON emails.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION emails.update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_config_updated_at ON emails.email_config;
CREATE TRIGGER update_email_config_updated_at
    BEFORE UPDATE ON emails.email_config
    FOR EACH ROW
    EXECUTE FUNCTION emails.update_updated_at_column();

-- =====================================================
-- TEMPLATES DE EJEMPLO
-- =====================================================
INSERT INTO emails.email_templates (slug, name, description, from_email, from_name, subject, body_html, body_text, variables) VALUES
(
    'welcome',
    'Bienvenida',
    'Email de bienvenida para nuevos usuarios',
    'info@urbix.es',
    'Equipo Urbix',
    'Bienvenido a Urbix, {{user_name}}',
    '<html><body><h1>¡Hola {{user_name}}!</h1><p>Bienvenido a Urbix. Estamos encantados de tenerte con nosotros.</p><p>Tu cuenta ha sido creada con el email: {{user_email}}</p><p>Saludos,<br>El equipo de Urbix</p></body></html>',
    'Hola {{user_name}}!\n\nBienvenido a Urbix. Estamos encantados de tenerte con nosotros.\n\nTu cuenta ha sido creada con el email: {{user_email}}\n\nSaludos,\nEl equipo de Urbix',
    '["user_name", "user_email"]'::jsonb
),
(
    'password-reset',
    'Recuperación de contraseña',
    'Email para restablecer contraseña',
    'noreply@urbix.es',
    'Urbix',
    'Restablecer tu contraseña',
    '<html><body><h1>Hola {{user_name}}</h1><p>Hemos recibido una solicitud para restablecer tu contraseña.</p><p>Haz clic en el siguiente enlace para continuar:</p><p><a href="{{reset_link}}">Restablecer contraseña</a></p><p>Este enlace expirará en {{expiry_hours}} horas.</p><p>Si no solicitaste este cambio, ignora este email.</p></body></html>',
    'Hola {{user_name}}\n\nHemos recibido una solicitud para restablecer tu contraseña.\n\nVisita este enlace para continuar: {{reset_link}}\n\nEste enlace expirará en {{expiry_hours}} horas.\n\nSi no solicitaste este cambio, ignora este email.',
    '["user_name", "reset_link", "expiry_hours"]'::jsonb
),
(
    'transaction-confirmation',
    'Confirmación de transacción',
    'Confirmación de transacción Lemonway',
    'pagos@urbix.es',
    'Urbix Pagos',
    'Confirmación de tu transacción #{{transaction_id}}',
    '<html><body><h1>Transacción confirmada</h1><p>Hola {{user_name}},</p><p>Tu transacción ha sido procesada correctamente.</p><ul><li><strong>ID:</strong> {{transaction_id}}</li><li><strong>Importe:</strong> {{amount}} €</li><li><strong>Fecha:</strong> {{date}}</li><li><strong>Concepto:</strong> {{concept}}</li></ul><p>Gracias por confiar en Urbix.</p></body></html>',
    'Transacción confirmada\n\nHola {{user_name}},\n\nTu transacción ha sido procesada correctamente.\n\nID: {{transaction_id}}\nImporte: {{amount}} €\nFecha: {{date}}\nConcepto: {{concept}}\n\nGracias por confiar en Urbix.',
    '["user_name", "transaction_id", "amount", "date", "concept"]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON SCHEMA emails IS 'Módulo de emails transaccionales';
COMMENT ON TABLE emails.email_templates IS 'Plantillas de email reutilizables con soporte para variables';
COMMENT ON TABLE emails.email_sends IS 'Registro histórico de todos los emails enviados';
COMMENT ON TABLE emails.email_config IS 'Configuración global del módulo de emails';
