-- Corregir valores en RolePermission.role para que coincidan con Role.name
-- Los valores deben estar en minúsculas con guiones bajos

-- Ver estado actual
SELECT 'Estado actual de RolePermission.role:' as info;
SELECT DISTINCT role, COUNT(*) as count 
FROM "RolePermission" 
GROUP BY role 
ORDER BY role;

-- Corregir los valores para que coincidan con Role.name
UPDATE "RolePermission"
SET role = 'superadmin'
WHERE role = 'SuperAdmin';

UPDATE "RolePermission"
SET role = 'gestor'
WHERE role = 'Gestor';

UPDATE "RolePermission"
SET role = 'supervisor'
WHERE role = 'Supervisor';

-- Verificar que todos los valores en RolePermission.role existen en Role.name
SELECT 'Verificación final - Roles en RolePermission:' as info;
SELECT DISTINCT rp.role, COUNT(*) as permisos_count
FROM "RolePermission" rp
GROUP BY rp.role
ORDER BY rp.role;

SELECT 'Verificación final - Roles en tabla Role:' as info;
SELECT name, "displayName", 
  (SELECT COUNT(*) FROM "RolePermission" WHERE role = "Role".name) as permisos_asignados
FROM "Role"
ORDER BY name;

-- Verificar que no hay roles huérfanos
SELECT 'Roles en RolePermission que NO existen en Role:' as info;
SELECT DISTINCT rp.role
FROM "RolePermission" rp
WHERE NOT EXISTS (
  SELECT 1 FROM "Role" r WHERE r.name = rp.role
);
