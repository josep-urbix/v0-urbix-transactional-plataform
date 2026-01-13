-- Diagnóstico del rol SuperAdmin

-- 1. Verificar si existe el rol SuperAdmin
SELECT 'Rol SuperAdmin:' as info;
SELECT * FROM public."Role" WHERE name = 'superadmin' OR "displayName" = 'SuperAdmin';

-- 2. Contar permisos asignados a SuperAdmin
SELECT 'Permisos de SuperAdmin:' as info;
SELECT COUNT(*) as total_permisos 
FROM public."RolePermission" 
WHERE role = 'SuperAdmin';

-- 3. Ver algunos permisos de SuperAdmin
SELECT 'Muestra de permisos de SuperAdmin:' as info;
SELECT rp.role, p.name as permiso, p.resource, p.action
FROM public."RolePermission" rp
JOIN public."Permission" p ON p.id = rp."permissionId"
WHERE rp.role = 'SuperAdmin'
LIMIT 10;

-- 4. Verificar el usuario josep@urbix.es
SELECT 'Usuario josep@urbix.es:' as info;
SELECT id, email, name, role FROM public."User" WHERE email = 'josep@urbix.es';

-- 5. Total de permisos en el sistema
SELECT 'Total de permisos disponibles:' as info;
SELECT COUNT(*) as total FROM public."Permission";

-- 6. Verificar si el problema es con la columna 'role' en RolePermission
SELECT 'Valores únicos en RolePermission.role:' as info;
SELECT DISTINCT role, COUNT(*) as permisos_count
FROM public."RolePermission"
GROUP BY role;
