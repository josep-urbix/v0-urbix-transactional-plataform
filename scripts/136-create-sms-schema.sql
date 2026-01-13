-- Create SMS schema and tables
-- Created: 2026-01-07
-- Last updated: 2026-01-07 16:30h

-- SMS Templates Table
CREATE TABLE IF NOT EXISTS sms_templates (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'auth',
  body TEXT NOT NULL,
  sender TEXT,
  variables JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SMS API Configuration Table
CREATE TABLE IF NOT EXISTS sms_api_config (
  id SERIAL PRIMARY KEY,
  provider_name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  access_token TEXT NOT NULL,
  default_sender TEXT,
  test_mode BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SMS Logs Table (for dashboard metrics)
CREATE TABLE IF NOT EXISTS sms_logs (
  id SERIAL PRIMARY KEY,
  template_key TEXT,
  to_phone TEXT NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_templates_key ON sms_templates(key);
CREATE INDEX IF NOT EXISTS idx_sms_templates_category ON sms_templates(category);
CREATE INDEX IF NOT EXISTS idx_sms_templates_is_active ON sms_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_sms_logs_template_key ON sms_logs(template_key);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at);

-- Drop triggers if they exist before creating them to make script idempotent
DROP TRIGGER IF EXISTS sms_templates_updated_at_trigger ON sms_templates;
DROP TRIGGER IF EXISTS sms_api_config_updated_at_trigger ON sms_api_config;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_sms_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sms_templates_updated_at_trigger
BEFORE UPDATE ON sms_templates
FOR EACH ROW
EXECUTE FUNCTION update_sms_templates_updated_at();

CREATE OR REPLACE FUNCTION update_sms_api_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sms_api_config_updated_at_trigger
BEFORE UPDATE ON sms_api_config
FOR EACH ROW
EXECUTE FUNCTION update_sms_api_config_updated_at();

-- Insert sample SMS templates
INSERT INTO sms_templates (key, name, description, category, body, variables) VALUES
('auth.otp.login', 'OTP Login', 'Código OTP para inicio de sesión', 'auth', 'Tu código de acceso es {{code}} y caduca en {{minutes}} minutos.', '[{"name":"code","type":"string","required":true},{"name":"minutes","type":"number","required":true}]'),
('auth.otp.reset', 'OTP Reset Password', 'Código OTP para reseteo de contraseña', 'auth', 'Tu código para resetear la contraseña es {{code}}. Caduca en {{minutes}} minutos.', '[{"name":"code","type":"string","required":true},{"name":"minutes","type":"number","required":true}]'),
('notification.document.signed', 'Documento Firmado', 'Notificación de documento firmado', 'notifications', 'Hola {{userName}}, tu documento "{{documentName}}" ha sido firmado correctamente.', '[{"name":"userName","type":"string","required":true},{"name":"documentName","type":"string","required":true}]')
ON CONFLICT (key) DO NOTHING;

-- Use WHERE NOT EXISTS to avoid inserting duplicate SMS logs
INSERT INTO sms_logs (template_key, to_phone, status, provider, created_at)
SELECT * FROM (VALUES
  ('auth.otp.login', '+34600111222', 'delivered', 'smsapi', NOW() - INTERVAL '1 hour'),
  ('auth.otp.login', '+34600333444', 'delivered', 'smsapi', NOW() - INTERVAL '2 hours'),
  ('auth.otp.reset', '+34600555666', 'sent', 'smsapi', NOW() - INTERVAL '3 hours'),
  ('notification.document.signed', '+34600777888', 'delivered', 'smsapi', NOW() - INTERVAL '1 day'),
  ('auth.otp.login', '+34600999000', 'failed', 'smsapi', NOW() - INTERVAL '2 days'),
  ('auth.otp.login', '+34600111333', 'delivered', 'smsapi', NOW() - INTERVAL '3 days')
) AS v(template_key, to_phone, status, provider, created_at)
WHERE NOT EXISTS (SELECT 1 FROM sms_logs LIMIT 1);
