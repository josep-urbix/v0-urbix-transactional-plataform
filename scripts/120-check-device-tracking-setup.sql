-- Script de diagnóstico para Device Tracking
-- Verifica el estado del sistema de tracking de dispositivos

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNÓSTICO DE DEVICE TRACKING';
  RAISE NOTICE '========================================';
END $$;

-- 1. Verificar si existe la columna trust_level en Device
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'investors' 
    AND table_name = 'Device' 
    AND column_name = 'trust_level'
  ) THEN
    RAISE NOTICE '✓ Columna trust_level existe en Device';
  ELSE
    RAISE NOTICE '✗ Columna trust_level NO existe en Device - EJECUTAR SCRIPT 119';
  END IF;
END $$;

-- 2. Verificar configuraciones en AdminSettings
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✓ Configuraciones de device tracking encontradas'
    ELSE '✗ NO hay configuraciones - EJECUTAR SCRIPT 119'
  END as status,
  COUNT(*) as config_count
FROM public."AdminSettings"
WHERE key LIKE 'device_tracking_%';

-- 3. Mostrar configuraciones actuales
SELECT 
  key,
  value,
  description
FROM public."AdminSettings"
WHERE key LIKE 'device_tracking_%'
ORDER BY key;

-- 4. Verificar dispositivos registrados
SELECT 
  COUNT(*) as total_devices,
  COUNT(CASE WHEN "trust_level" = 'enhanced' THEN 1 END) as enhanced_trust_devices,
  COUNT(CASE WHEN "trust_level" = 'standard' THEN 1 END) as standard_devices,
  COUNT(CASE WHEN "is_trusted" = true THEN 1 END) as trusted_devices
FROM investors."Device";

-- 5. Mostrar últimos dispositivos registrados (si existen)
SELECT 
  fingerprint,
  name,
  device_type,
  browser,
  os,
  "trust_level",
  "is_trusted",
  "first_seen_at",
  "last_seen_at"
FROM investors."Device"
ORDER BY "first_seen_at" DESC
LIMIT 5;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIN DEL DIAGNÓSTICO';
  RAISE NOTICE '========================================';
END $$;
