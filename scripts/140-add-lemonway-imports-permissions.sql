-- =====================================================
-- Permisos RBAC para el sistema de importación de transacciones de Lemonway
-- =====================================================

-- Insertar nuevos permisos para el módulo de importación
INSERT INTO "Permission" (id, name, description, resource, action) VALUES
('lemonway-imports-view', 'lemonway_imports:view', 'Ver historial de importaciones de transacciones de Lemonway', 'lemonway_imports', 'view'),
('lemonway-imports-start', 'lemonway_imports:start', 'Iniciar nuevas importaciones de transacciones', 'lemonway_imports', 'start'),
('lemonway-imports-retry', 'lemonway_imports:retry', 'Reintentar importaciones fallidas', 'lemonway_imports', 'retry'),
('lemonway-temp-view', 'lemonway_temp:view', 'Ver movimientos temporales importados de Lemonway', 'lemonway_temp', 'view'),
('lemonway-temp-edit', 'lemonway_temp:edit', 'Editar tipo de operación de movimientos temporales', 'lemonway_temp', 'edit'),
('lemonway-temp-approve', 'lemonway_temp:approve', 'Aprobar y migrar movimientos a contabilidad definitiva', 'lemonway_temp', 'approve')
ON CONFLICT (id) DO NOTHING;

-- Asignar todos los permisos a superadmin
INSERT INTO "RolePermission" (role, "permissionId") VALUES
('superadmin', 'lemonway-imports-view'),
('superadmin', 'lemonway-imports-start'),
('superadmin', 'lemonway-imports-retry'),
('superadmin', 'lemonway-temp-view'),
('superadmin', 'lemonway-temp-edit'),
('superadmin', 'lemonway-temp-approve')
ON CONFLICT DO NOTHING;

-- Asignar permisos de visualización y operación básica a admin
INSERT INTO "RolePermission" (role, "permissionId") VALUES
('admin', 'lemonway-imports-view'),
('admin', 'lemonway-imports-start'),
('admin', 'lemonway-temp-view'),
('admin', 'lemonway-temp-edit')
ON CONFLICT DO NOTHING;

-- Verificar permisos creados
SELECT 
  p.id, 
  p.name, 
  p.resource, 
  p.action,
  COUNT(rp.role) as roles_assigned
FROM "Permission" p
LEFT JOIN "RolePermission" rp ON p.id = rp."permissionId"
WHERE p.resource IN ('lemonway_imports', 'lemonway_temp')
GROUP BY p.id, p.name, p.resource, p.action
ORDER BY p.resource, p.action;
