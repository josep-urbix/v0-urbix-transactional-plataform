-- Crear rol SuperAdmin con todos los permisos y asignarlo a josep@urbix.es

-- 1. Crear el rol SuperAdmin
INSERT INTO public."Role" (id, name, "displayName", description, "isSystem", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'superadmin',
  'SuperAdmin',
  'Rol con acceso completo a todas las funcionalidades del sistema',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (name) DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  description = EXCLUDED.description,
  "updatedAt" = NOW();

-- Corregido para usar permissionId en lugar de permission
-- 2. Asignar TODOS los permisos disponibles al rol SuperAdmin
INSERT INTO public."RolePermission" (id, role, "permissionId", "createdAt")
SELECT 
  gen_random_uuid(),
  'SuperAdmin',
  p.id,
  NOW()
FROM public."Permission" p
WHERE NOT EXISTS (
  SELECT 1 
  FROM public."RolePermission" rp 
  WHERE rp.role = 'SuperAdmin' AND rp."permissionId" = p.id
);

-- 3. Asignar el rol SuperAdmin al usuario josep@urbix.es
UPDATE public."User"
SET 
  role = 'SuperAdmin'
WHERE email = 'josep@urbix.es';

-- 4. Verificar la creación del rol y asignación de permisos
SELECT 
  'Rol SuperAdmin creado/actualizado' as status,
  COUNT(*) as total_permisos
FROM public."RolePermission"
WHERE role = 'SuperAdmin';

-- 5. Verificar que el usuario tiene el rol asignado
SELECT 
  id,
  email,
  name,
  role,
  'Usuario actualizado correctamente' as status
FROM public."User"
WHERE email = 'josep@urbix.es';

-- Corregido el JOIN para usar permissionId
-- 6. Mostrar resumen de permisos por categoría
SELECT 
  p.resource as categoria,
  COUNT(*) as permisos_asignados
FROM public."RolePermission" rp
JOIN public."Permission" p ON rp."permissionId" = p.id
WHERE rp.role = 'SuperAdmin'
GROUP BY p.resource
ORDER BY p.resource;
