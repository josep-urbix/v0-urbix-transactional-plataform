-- Añadir columna de nivel de confianza a la tabla Device
ALTER TABLE investors."Device"
ADD COLUMN IF NOT EXISTS trust_level VARCHAR(20) DEFAULT 'basic';

-- trust_level puede ser: 'basic', 'standard' (con 2FA), 'high' (manual), 'verified' (30+ días)

COMMENT ON COLUMN investors."Device".trust_level IS 'Nivel de confianza del dispositivo: basic (sin 2FA), standard (con 2FA), high (marcado manualmente), verified (uso prolongado sin incidentes)';

-- Añadir configuraciones de tracking en AdminSettings
INSERT INTO public."AdminSettings" (key, value, description, is_secret, created_at, updated_at)
VALUES 
  ('device_tracking_interval_basic', '600000', 'Intervalo de actualización para dispositivos básicos (ms) - 10 minutos por defecto', false, NOW(), NOW()),
  ('device_tracking_interval_standard', '1800000', 'Intervalo de actualización para dispositivos con 2FA (ms) - 30 minutos por defecto', false, NOW(), NOW()),
  ('device_tracking_enabled', 'true', 'Habilitar tracking automático de dispositivos', false, NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_device_user_fingerprint ON investors."Device"(user_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_trust_level ON investors."Device"(trust_level);
CREATE INDEX IF NOT EXISTS idx_device_last_seen ON investors."Device"(last_seen_at DESC);

SELECT 
  'Columna trust_level añadida' as info,
  COUNT(*) as total_devices
FROM investors."Device";
