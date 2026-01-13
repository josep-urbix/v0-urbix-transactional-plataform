-- Script 125: Limpieza de roles duplicados y consolidación
-- Objetivo: Dejar solo SuperAdmin, Gestor, Supervisor como roles principales

-- Paso 1: Migrar todos los permisos de admin/Admin a SuperAdmin si no existen
INSERT INTO public."RolePermission" (id, role, "permissionId", "createdAt")
SELECT 
  gen_random_uuid(),
  'SuperAdmin',
  rp."permissionId",
  NOW()
FROM public."RolePermission" rp
WHERE rp.role IN ('admin', 'Admin')
  AND NOT EXISTS (
    SELECT 1 FROM public."RolePermission" rp2 
    WHERE rp2.role = 'SuperAdmin' 
    AND rp2."permissionId" = rp."permissionId"
  );

-- Paso 2: Actualizar usuarios con rol admin/Admin a SuperAdmin
UPDATE public."User" 
SET role = 'SuperAdmin' 
WHERE role IN ('admin', 'Admin');

-- Paso 3: Eliminar permisos de roles duplicados/obsoletos
DELETE FROM public."RolePermission" 
WHERE role IN ('admin', 'Admin', 'user', 'nuevo_rol');

-- Paso 4: Eliminar roles duplicados/obsoletos
DELETE FROM public."Role" 
WHERE name IN ('admin', 'user', 'nuevo_rol') 
   OR "displayName" IN ('Admin', 'Usuario', 'nuevo_rol');

-- Paso 5: Verificación final
SELECT '=== ROLES FINALES ===' as info;
SELECT name, "displayName", "isSystem", 
       (SELECT COUNT(*) FROM public."RolePermission" WHERE role = r."displayName") as permisos
FROM public."Role" r
ORDER BY "isSystem" DESC, name;

SELECT '=== USUARIOS ===' as info;
SELECT email, role FROM public."User" LIMIT 10;

SELECT '=== PERMISOS POR ROL ===' as info;
SELECT role, COUNT(*) as total_permisos
FROM public."RolePermission"
GROUP BY role
ORDER BY total_permisos DESC;
