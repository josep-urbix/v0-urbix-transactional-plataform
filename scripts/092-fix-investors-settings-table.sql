-- =====================================================
-- Script para corregir la tabla investors.Settings
-- Ejecutar antes del script 090
-- =====================================================

-- Añadir columna description si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'investors' 
        AND table_name = 'Settings' 
        AND column_name = 'description'
    ) THEN
        ALTER TABLE investors."Settings" ADD COLUMN description TEXT;
    END IF;
END $$;

-- Añadir columna updated_at si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'investors' 
        AND table_name = 'Settings' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE investors."Settings" ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

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
