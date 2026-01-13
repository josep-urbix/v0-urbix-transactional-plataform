-- Crear tabla de configuración para el middleware/admin
CREATE TABLE IF NOT EXISTS "AdminSettings" (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_admin_settings_key ON "AdminSettings"(key);

-- Insertar configuraciones por defecto (vacías)
INSERT INTO "AdminSettings" (key, value, description, is_secret)
VALUES 
  ('google_client_id', '', 'Google OAuth Client ID para el panel de administración', false),
  ('google_client_secret', '', 'Google OAuth Client Secret para el panel de administración', true),
  ('allowed_email_domains', 'urbix.es', 'Dominios de email permitidos para login (separados por coma)', false)
ON CONFLICT (key) DO NOTHING;
