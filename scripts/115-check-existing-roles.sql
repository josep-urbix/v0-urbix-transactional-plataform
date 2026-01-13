-- Diagnóstico de roles y permisos existentes

-- 1. Roles existentes
SELECT 'ROLES EXISTENTES' as info;
SELECT name, "displayName", description, "isSystem"
FROM public."Role"
ORDER BY name;

-- 2. Permisos existentes
SELECT 'PERMISOS EXISTENTES' as info;
SELECT COUNT(*) as total_permisos
FROM public."Permission";

SELECT resource, action, name
FROM public."Permission"
WHERE resource IN ('bpm', 'task')
ORDER BY resource, action
LIMIT 20;

-- 3. Asignaciones de permisos a roles
SELECT 'ASIGNACIONES ROLE-PERMISSION' as info;
SELECT role, COUNT(*) as permisos_asignados
FROM public."RolePermission"
GROUP BY role
ORDER BY role;

-- 4. Usuarios y sus roles
SELECT 'USUARIOS Y ROLES' as info;
SELECT role, COUNT(*) as cantidad_usuarios
FROM public."User"
GROUP BY role
ORDER BY role;
