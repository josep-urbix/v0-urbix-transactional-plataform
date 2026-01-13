-- =====================================================
-- RBAC para OPCIÓN 2 - Permisos Lemonway Admin Dashboard
-- =====================================================
-- Descripción: Define todos los permisos necesarios para
--              gestionar el nuevo panel admin de Lemonway
-- Autor: Sistema URBIX
-- Fecha: 2026-01-12
-- =====================================================

-- =====================================================
-- 1. Crear permisos granulares para Queue Management
-- =====================================================
INSERT INTO "Permission" (name, description, resource, action) VALUES
('lemonway:queue:view', 'Ver cola de solicitudes de Lemonway', 'lemonway:queue', 'view'),
('lemonway:queue:manage', 'Gestionar cola (pausar, reanudar, priorizar)', 'lemonway:queue', 'manage'),
('lemonway:queue:retry', 'Reintentar solicitudes fallidas', 'lemonway:queue', 'retry'),
('lemonway:queue:delete', 'Eliminar solicitudes de la cola', 'lemonway:queue', 'delete')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. Permisos para Custom Queries
-- =====================================================
INSERT INTO "Permission" (name, description, resource, action) VALUES
('lemonway:queries:view', 'Ver queries personalizadas guardadas', 'lemonway:queries', 'view'),
('lemonway:queries:create', 'Crear nuevas queries personalizadas', 'lemonway:queries', 'create'),
('lemonway:queries:edit', 'Editar queries existentes', 'lemonway:queries', 'edit'),
('lemonway:queries:delete', 'Eliminar queries personalizadas', 'lemonway:queries', 'delete'),
('lemonway:queries:execute', 'Ejecutar queries personalizadas', 'lemonway:queries', 'execute')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. Permisos para Operation Types
-- =====================================================
INSERT INTO "Permission" (name, description, resource, action) VALUES
('lemonway:operations:view', 'Ver tipos de operación configurados', 'lemonway:operations', 'view'),
('lemonway:operations:create', 'Crear tipos de operación', 'lemonway:operations', 'create'),
('lemonway:operations:edit', 'Editar tipos de operación', 'lemonway:operations', 'edit'),
('lemonway:operations:delete', 'Eliminar tipos de operación', 'lemonway:operations', 'delete')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 4. Permisos para API Explorer Integration
-- =====================================================
INSERT INTO "Permission" (name, description, resource, action) VALUES
('lemonway:explorer:view', 'Ver API Explorer integrado', 'lemonway:explorer', 'view'),
('lemonway:explorer:test', 'Ejecutar llamadas de prueba en API Explorer', 'lemonway:explorer', 'test'),
('lemonway:explorer:dryrun', 'Ejecutar llamadas en modo Dry-Run', 'lemonway:explorer', 'dryrun'),
('lemonway:explorer:snapshots', 'Gestionar snapshots de pruebas', 'lemonway:explorer', 'snapshots')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 5. Permisos para Dashboard Management
-- =====================================================
INSERT INTO "Permission" (name, description, resource, action) VALUES
('lemonway:dashboard:view', 'Ver dashboard de Lemonway', 'lemonway:dashboard', 'view'),
('lemonway:dashboard:config', 'Configurar dashboard (tabs, layout)', 'lemonway:dashboard', 'config'),
('lemonway:webhooks:view', 'Ver webhooks y eventos', 'lemonway:webhooks', 'view'),
('lemonway:webhooks:simulate', 'Simular webhooks', 'lemonway:webhooks', 'simulate')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 6. Asignar permisos a SuperAdmin (acceso total)
-- =====================================================
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'SuperAdmin', id FROM "Permission" 
WHERE name LIKE 'lemonway:%'
ON CONFLICT (role, "permissionId") DO NOTHING;

-- =====================================================
-- 7. Asignar permisos a Admin (acceso parcial)
-- =====================================================
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'admin', id FROM "Permission" 
WHERE name IN (
  'lemonway:queue:view',
  'lemonway:queue:manage',
  'lemonway:queries:view',
  'lemonway:queries:execute',
  'lemonway:operations:view',
  'lemonway:explorer:view',
  'lemonway:explorer:test',
  'lemonway:dashboard:view',
  'lemonway:webhooks:view'
)
ON CONFLICT (role, "permissionId") DO NOTHING;

-- =====================================================
-- 8. Asignar permisos a Manager (acceso limitado)
-- =====================================================
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'manager', id FROM "Permission" 
WHERE name IN (
  'lemonway:queue:view',
  'lemonway:queries:view',
  'lemonway:operations:view',
  'lemonway:dashboard:view'
)
ON CONFLICT (role, "permissionId") DO NOTHING;

-- =====================================================
-- 9. Crear índices para búsquedas rápidas
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_permission_lemonway ON "Permission"(resource) 
WHERE resource LIKE 'lemonway:%';

CREATE INDEX IF NOT EXISTS idx_role_permission_role ON "RolePermission"(role);

-- =====================================================
-- 10. Verificación final
-- =====================================================
SELECT 
  'Permisos Lemonway' AS tipo,
  COUNT(*) AS cantidad
FROM "Permission" 
WHERE resource LIKE 'lemonway:%'
UNION ALL
SELECT 
  'Asignaciones RolePermission' AS tipo,
  COUNT(*) AS cantidad
FROM "RolePermission" 
WHERE "permissionId" IN (
  SELECT id FROM "Permission" WHERE resource LIKE 'lemonway:%'
);
