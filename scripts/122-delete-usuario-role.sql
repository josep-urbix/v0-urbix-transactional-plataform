-- Script para eliminar el rol de sistema "Usuario" que tiene 0 permisos asignados
-- Este script primero elimina las relaciones de permisos y luego el rol

-- 1. Eliminar todas las relaciones RolePermission para el rol "Usuario"
DELETE FROM public."RolePermission"
WHERE role = 'Usuario';

-- 2. Eliminar el rol "Usuario" de la tabla Role
DELETE FROM public."Role"
WHERE name = 'Usuario';

-- Verificar que el rol se ha eliminado
SELECT 
  'Rol eliminado exitosamente' as status,
  COUNT(*) as roles_restantes
FROM public."Role";

-- Mostrar los roles que quedan en el sistema
SELECT 
  name,
  "displayName",
  description,
  "isSystem",
  "createdAt"
FROM public."Role"
ORDER BY "createdAt";
