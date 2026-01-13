-- =====================================================
-- INICIALIZAR ROLES DEL SISTEMA
-- =====================================================

-- Insertar roles base si no existen
INSERT INTO public."Role" (name, "displayName", description, "isSystem")
VALUES 
  ('Admin', 'Administrador', 'Acceso completo al sistema', true),
  ('Gestor', 'Gestor', 'Gestión operativa del sistema', true),
  ('Supervisor', 'Supervisor', 'Supervisión y monitoreo de operaciones', true),
  ('Usuario', 'Usuario', 'Acceso básico al sistema', true)
ON CONFLICT (name) DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  description = EXCLUDED.description,
  "isSystem" = EXCLUDED."isSystem";

-- Verificar roles creados
SELECT 
  'Roles creados correctamente' as info,
  COUNT(*) as cantidad
FROM public."Role";

-- Mostrar roles existentes
SELECT 
  name,
  "displayName",
  description,
  "isSystem",
  "createdAt"
FROM public."Role"
ORDER BY name;
