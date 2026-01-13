-- =====================================================
-- SCHEMA: investors
-- Módulo de autenticación y gestión de inversores
-- Para desktop.urbix.es
-- =====================================================

-- Crear schema
CREATE SCHEMA IF NOT EXISTS investors;

-- =====================================================
-- TABLA: investors.users
-- Usuarios inversores con autenticación multi-método
-- =====================================================
CREATE TABLE IF NOT EXISTS investors."User" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    
    -- Datos personales
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(200),
    avatar_url TEXT,
    
    -- Autenticación
    password_hash VARCHAR(255),  -- NULL si usa solo OAuth/Magic Link
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- OAuth providers
    google_id VARCHAR(255) UNIQUE,
    apple_id VARCHAR(255) UNIQUE,
    
    -- 2FA
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),  -- TOTP secret encriptado
    two_factor_backup_codes JSONB,   -- Array de códigos de respaldo hasheados
    
    -- Estado
    status VARCHAR(20) DEFAULT 'pending_verification' CHECK (status IN (
        'pending_verification',  -- Esperando verificación de email
        'active',                -- Cuenta activa
        'suspended',             -- Suspendida por admin
        'blocked',               -- Bloqueada por seguridad
        'deleted'                -- Soft delete
    )),
    status_reason TEXT,
    
    -- KYC (sincronizado con Lemonway)
    kyc_status VARCHAR(20) DEFAULT 'none' CHECK (kyc_status IN (
        'none',           -- Sin KYC
        'pending',        -- KYC en proceso
        'approved',       -- KYC aprobado
        'rejected',       -- KYC rechazado
        'expired'         -- KYC expirado
    )),
    kyc_level INTEGER DEFAULT 0,
    kyc_verified_at TIMESTAMPTZ,
    
    -- Preferencias
    language VARCHAR(5) DEFAULT 'es',
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
    
    -- Metadatos
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- TABLA: investors.sessions
-- Sesiones activas con información del dispositivo
-- =====================================================
CREATE TABLE IF NOT EXISTS investors."Session" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES investors."User"(id) ON DELETE CASCADE,
    
    -- Token
    token_hash VARCHAR(255) NOT NULL UNIQUE,  -- SHA256 del token
    refresh_token_hash VARCHAR(255) UNIQUE,
    
    -- Expiración
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ,
    
    -- Dispositivo
    device_id UUID,
    device_name VARCHAR(255),
    device_type VARCHAR(50),  -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Ubicación
    ip_address INET,
    country VARCHAR(2),
    city VARCHAR(100),
    
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(255),
    
    -- Metadatos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: investors.devices
-- Dispositivos de confianza registrados
-- =====================================================
CREATE TABLE IF NOT EXISTS investors."Device" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES investors."User"(id) ON DELETE CASCADE,
    
    -- Identificación
    fingerprint VARCHAR(255) NOT NULL,  -- Hash único del dispositivo
    name VARCHAR(255),
    
    -- Información
    device_type VARCHAR(50) NOT NULL,
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Estado
    is_trusted BOOLEAN DEFAULT FALSE,
    trusted_at TIMESTAMPTZ,
    
    -- Primera y última vez visto
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ubicación última conexión
    last_ip INET,
    last_country VARCHAR(2),
    last_city VARCHAR(100),
    
    -- Metadatos
    metadata JSONB DEFAULT '{}'::jsonb,
    
    UNIQUE(user_id, fingerprint)
);

-- =====================================================
-- TABLA: investors.magic_links
-- Tokens para autenticación por email
-- =====================================================
CREATE TABLE IF NOT EXISTS investors."MagicLink" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Usuario (puede ser NULL si es registro nuevo)
    user_id UUID REFERENCES investors."User"(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    
    -- Token
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    
    -- Propósito
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN (
        'login',              -- Login sin contraseña
        'register',           -- Registro nuevo usuario
        'verify_email',       -- Verificar email
        'reset_password',     -- Resetear contraseña
        'link_device'         -- Vincular nuevo dispositivo
    )),
    
    -- Estado
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    
    -- Metadatos de la solicitud
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: investors.wallet_links
-- Vinculación con wallets de Lemonway
-- =====================================================
CREATE TABLE IF NOT EXISTS investors."WalletLink" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES investors."User"(id) ON DELETE CASCADE,
    
    -- Datos del wallet Lemonway
    wallet_id VARCHAR(100) NOT NULL,  -- Account.Id en Lemonway
    wallet_internal_id VARCHAR(100),  -- Account.InternalId
    wallet_status VARCHAR(50),
    
    -- Estado del vínculo
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',    -- Pendiente de verificación
        'verified',   -- Verificado y activo
        'suspended',  -- Suspendido temporalmente
        'revoked'     -- Revocado permanentemente
    )),
    
    -- Verificación
    verified_at TIMESTAMPTZ,
    verified_by VARCHAR(100),  -- Admin que verificó
    
    -- Sincronización
    last_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    
    -- Metadatos
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, wallet_id)
);

-- =====================================================
-- TABLA: investors.login_attempts
-- Registro de intentos de login para seguridad
-- =====================================================
CREATE TABLE IF NOT EXISTS investors."LoginAttempt" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificación
    email VARCHAR(255),
    user_id UUID REFERENCES investors."User"(id) ON DELETE SET NULL,
    
    -- Método de autenticación
    auth_method VARCHAR(50) NOT NULL CHECK (auth_method IN (
        'password',
        'magic_link',
        'google',
        'apple',
        'two_factor'
    )),
    
    -- Resultado
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    
    -- Dispositivo
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Ubicación
    country VARCHAR(2),
    city VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: investors.activity_log
-- Log de actividad del usuario
-- =====================================================
CREATE TABLE IF NOT EXISTS investors."ActivityLog" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES investors."User"(id) ON DELETE CASCADE,
    
    -- Acción
    action VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,  -- 'auth', 'profile', 'wallet', 'investment', 'security'
    
    -- Detalles
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Contexto
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLA: investors.notifications
-- Notificaciones para el usuario
-- =====================================================
CREATE TABLE IF NOT EXISTS investors."Notification" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES investors."User"(id) ON DELETE CASCADE,
    
    -- Contenido
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Tipo
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'info',
        'success',
        'warning',
        'error',
        'investment',
        'kyc',
        'security'
    )),
    
    -- Estado
    read_at TIMESTAMPTZ,
    
    -- Acción opcional
    action_url TEXT,
    action_label VARCHAR(100),
    
    -- Metadatos
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- =====================================================
-- ÍNDICES
-- =====================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_investors_user_email ON investors."User"(email);
CREATE INDEX IF NOT EXISTS idx_investors_user_google_id ON investors."User"(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investors_user_apple_id ON investors."User"(apple_id) WHERE apple_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_investors_user_status ON investors."User"(status);
CREATE INDEX IF NOT EXISTS idx_investors_user_created_at ON investors."User"(created_at);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_investors_session_user_id ON investors."Session"(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_session_token ON investors."Session"(token_hash);
CREATE INDEX IF NOT EXISTS idx_investors_session_expires ON investors."Session"(expires_at) WHERE is_active = TRUE;

-- Devices
CREATE INDEX IF NOT EXISTS idx_investors_device_user_id ON investors."Device"(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_device_fingerprint ON investors."Device"(fingerprint);

-- Magic Links
CREATE INDEX IF NOT EXISTS idx_investors_magic_link_token ON investors."MagicLink"(token_hash);
CREATE INDEX IF NOT EXISTS idx_investors_magic_link_email ON investors."MagicLink"(email);
CREATE INDEX IF NOT EXISTS idx_investors_magic_link_expires ON investors."MagicLink"(expires_at) WHERE used_at IS NULL;

-- Wallet Links
CREATE INDEX IF NOT EXISTS idx_investors_wallet_link_user ON investors."WalletLink"(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_wallet_link_wallet ON investors."WalletLink"(wallet_id);

-- Login Attempts
CREATE INDEX IF NOT EXISTS idx_investors_login_attempt_email ON investors."LoginAttempt"(email);
CREATE INDEX IF NOT EXISTS idx_investors_login_attempt_ip ON investors."LoginAttempt"(ip_address);
CREATE INDEX IF NOT EXISTS idx_investors_login_attempt_created ON investors."LoginAttempt"(created_at);

-- Activity Log
CREATE INDEX IF NOT EXISTS idx_investors_activity_user ON investors."ActivityLog"(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_activity_created ON investors."ActivityLog"(created_at);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_investors_notification_user ON investors."Notification"(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_notification_unread ON investors."Notification"(user_id, created_at) WHERE read_at IS NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para updated_at en User
CREATE OR REPLACE FUNCTION investors.update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_timestamp
    BEFORE UPDATE ON investors."User"
    FOR EACH ROW
    EXECUTE FUNCTION investors.update_user_timestamp();

-- Trigger para updated_at en WalletLink
CREATE TRIGGER trigger_update_wallet_link_timestamp
    BEFORE UPDATE ON investors."WalletLink"
    FOR EACH ROW
    EXECUTE FUNCTION investors.update_user_timestamp();

-- =====================================================
-- FUNCIÓN: Limpiar sesiones expiradas
-- =====================================================
CREATE OR REPLACE FUNCTION investors.cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM investors."Session"
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- También desactivar en lugar de eliminar para auditoría
    UPDATE investors."Session"
    SET is_active = FALSE, revoked_reason = 'expired'
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Limpiar magic links expirados
-- =====================================================
CREATE OR REPLACE FUNCTION investors.cleanup_expired_magic_links()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM investors."MagicLink"
    WHERE expires_at < NOW() AND used_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTA: Estadísticas de usuarios
-- =====================================================
CREATE OR REPLACE VIEW investors.user_stats AS
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE status = 'active') as active_users,
    COUNT(*) FILTER (WHERE status = 'pending_verification') as pending_users,
    COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users,
    COUNT(*) FILTER (WHERE status = 'blocked') as blocked_users,
    COUNT(*) FILTER (WHERE two_factor_enabled = TRUE) as users_with_2fa,
    COUNT(*) FILTER (WHERE google_id IS NOT NULL) as users_with_google,
    COUNT(*) FILTER (WHERE apple_id IS NOT NULL) as users_with_apple,
    COUNT(*) FILTER (WHERE kyc_status = 'approved') as kyc_approved,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as new_last_24h,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_last_7d,
    COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '24 hours') as active_last_24h
FROM investors."User"
WHERE deleted_at IS NULL;

-- =====================================================
-- TABLA: investors.settings
-- Configuración de la aplicación
-- =====================================================
CREATE TABLE IF NOT EXISTS investors."Settings" (
    key VARCHAR(255) PRIMARY KEY,
    value VARCHAR(255),
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar configuración inicial
INSERT INTO investors."Settings" (key, value, description)
VALUES 
    ('investors_magic_link_expiry_minutes', '15', 'Tiempo de expiración de magic links en minutos'),
    ('investors_session_expiry_hours', '24', 'Tiempo de expiración de sesiones en horas'),
    ('investors_refresh_token_expiry_days', '30', 'Tiempo de expiración de refresh tokens en días'),
    ('investors_max_login_attempts', '5', 'Máximo de intentos de login antes de bloqueo temporal'),
    ('investors_lockout_minutes', '15', 'Minutos de bloqueo tras exceder intentos de login'),
    ('investors_require_2fa_for_withdrawals', 'true', 'Requerir 2FA para retiros')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();
