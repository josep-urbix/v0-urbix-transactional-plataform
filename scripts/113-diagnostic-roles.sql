-- Script de diagnóstico para verificar el estado de Roles, Permisos y Asignaciones

-- 1. Verificar roles en la tabla Role
SELECT 'Roles en la tabla Role' as info, COUNT(*) as cantidad FROM public."Role";
SELECT * FROM public."Role" ORDER BY "createdAt" DESC LIMIT 10;

-- 2. Verificar permisos en la tabla Permission
SELECT 'Permisos en la tabla Permission' as info, COUNT(*) as cantidad FROM public."Permission";
SELECT * FROM public."Permission" ORDER BY "createdAt" DESC LIMIT 10;

-- 3. Verificar asignaciones en RolePermission
SELECT 'Asignaciones en RolePermission' as info, COUNT(*) as cantidad FROM public."RolePermission";
SELECT * FROM public."RolePermission" LIMIT 20;

-- 4. Verificar usuarios y sus roles
SELECT 'Usuarios con roles asignados' as info, COUNT(*) as cantidad FROM public."User" WHERE role IS NOT NULL;
SELECT id, email, role, "isActive" FROM public."User" LIMIT 10;

-- 5. Verificar permisos BPM
SELECT 'Permisos BPM' as info, COUNT(*) as cantidad 
FROM public."Permission" 
WHERE resource LIKE 'bpm%';

-- 6. Verificar permisos TASK
SELECT 'Permisos TASK' as info, COUNT(*) as cantidad 
FROM public."Permission" 
WHERE resource LIKE 'task%';

-- 7. Resultado final
SELECT 
  'Resumen' as info,
  (SELECT COUNT(*) FROM public."Role") as total_roles,
  (SELECT COUNT(*) FROM public."Permission") as total_permisos,
  (SELECT COUNT(*) FROM public."RolePermission") as total_asignaciones;
