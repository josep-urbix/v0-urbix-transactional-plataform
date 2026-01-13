-- Diagnóstico completo del sistema de roles y permisos

-- 1. Ver el usuario josep@urbix.es
SELECT 
    id,
    email,
    role,
    "createdAt"
FROM public."User"
WHERE email = 'josep@urbix.es';

-- 2. Ver todos los roles existentes
SELECT 
    name,
    "displayName",
    description,
    "isSystem",
    "createdAt"
FROM public."Role"
ORDER BY "createdAt" DESC;

-- 3. Ver cuántos permisos tiene cada rol
SELECT 
    rp.role,
    COUNT(*) as total_permisos
FROM public."RolePermission" rp
GROUP BY rp.role
ORDER BY total_permisos DESC;

-- 4. Ver permisos del rol SuperAdmin (si existe)
SELECT 
    p.id,
    p.name,
    p.resource,
    p.action,
    p.description
FROM public."RolePermission" rp
JOIN public."Permission" p ON rp."permissionId" = p.id
WHERE rp.role = 'SuperAdmin'
ORDER BY p.resource, p.action;

-- 5. Ver todos los permisos disponibles en el sistema
SELECT 
    resource,
    COUNT(*) as permisos_por_recurso
FROM public."Permission"
GROUP BY resource
ORDER BY permisos_por_recurso DESC;

-- 6. Total de permisos en el sistema
SELECT COUNT(*) as total_permisos_sistema
FROM public."Permission";

-- 7. Verificar si hay roles sin permisos
SELECT 
    r."displayName",
    r.name,
    COUNT(rp.id) as permisos_asignados
FROM public."Role" r
LEFT JOIN public."RolePermission" rp ON r."displayName" = rp.role
GROUP BY r."displayName", r.name
ORDER BY permisos_asignados ASC;
