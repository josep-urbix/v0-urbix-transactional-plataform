-- Script 111: Añadir permisos granulares para Business Process Manager (BPM)
-- Fecha: 2026-01-05
-- Descripción: Permisos CRUD y ejecución para gestión de procesos de negocio

-- =====================================================
-- 1. CREAR PERMISOS GRANULARES PARA BPM
-- =====================================================

-- Permisos de lectura/visualización
INSERT INTO "Permission" (name, resource, action, description)
VALUES 
  ('bpm:view', 'BPM', 'VIEW', 'Ver lista de procesos de negocio'),
  ('bpm:view_details', 'BPM', 'VIEW_DETAILS', 'Ver detalles completos de un proceso'),
  ('bpm:view_history', 'BPM', 'VIEW_HISTORY', 'Ver historial de ejecuciones de procesos')
ON CONFLICT (name) DO NOTHING;

-- Permisos de escritura/modificación
INSERT INTO "Permission" (name, resource, action, description)
VALUES 
  ('bpm:create', 'BPM', 'CREATE', 'Crear nuevos procesos de negocio'),
  ('bpm:edit', 'BPM', 'EDIT', 'Editar procesos existentes'),
  ('bpm:delete', 'BPM', 'DELETE', 'Eliminar procesos de negocio'),
  ('bpm:duplicate', 'BPM', 'DUPLICATE', 'Duplicar procesos existentes')
ON CONFLICT (name) DO NOTHING;

-- Permisos de ejecución
INSERT INTO "Permission" (name, resource, action, description)
VALUES 
  ('bpm:execute', 'BPM', 'EXECUTE', 'Ejecutar procesos de negocio'),
  ('bpm:execute_manual', 'BPM', 'EXECUTE_MANUAL', 'Ejecutar procesos manualmente (fuera de automatización)'),
  ('bpm:cancel_execution', 'BPM', 'CANCEL_EXECUTION', 'Cancelar ejecuciones en progreso'),
  ('bpm:retry_failed', 'BPM', 'RETRY_FAILED', 'Reintentar ejecuciones fallidas')
ON CONFLICT (name) DO NOTHING;

-- Permisos de gestión de eventos
INSERT INTO "Permission" (name, resource, action, description)
VALUES 
  ('bpm:view_events', 'BPM', 'VIEW_EVENTS', 'Ver eventos que disparan procesos'),
  ('bpm:create_events', 'BPM', 'CREATE_EVENTS', 'Crear nuevos eventos/triggers'),
  ('bpm:edit_events', 'BPM', 'EDIT_EVENTS', 'Editar eventos existentes'),
  ('bpm:delete_events', 'BPM', 'DELETE_EVENTS', 'Eliminar eventos')
ON CONFLICT (name) DO NOTHING;

-- Permisos de configuración avanzada
INSERT INTO "Permission" (name, resource, action, description)
VALUES 
  ('bpm:manage_templates', 'BPM', 'MANAGE_TEMPLATES', 'Gestionar plantillas de procesos'),
  ('bpm:manage_variables', 'BPM', 'MANAGE_VARIABLES', 'Gestionar variables globales de procesos'),
  ('bpm:export', 'BPM', 'EXPORT', 'Exportar definiciones de procesos'),
  ('bpm:import', 'BPM', 'IMPORT', 'Importar definiciones de procesos'),
  ('bpm:manage_integrations', 'BPM', 'MANAGE_INTEGRATIONS', 'Configurar integraciones externas')
ON CONFLICT (name) DO NOTHING;

-- Permisos de auditoría y monitoreo
INSERT INTO "Permission" (name, resource, action, description)
VALUES 
  ('bpm:view_analytics', 'BPM', 'VIEW_ANALYTICS', 'Ver analytics y métricas de procesos'),
  ('bpm:view_logs', 'BPM', 'VIEW_LOGS', 'Ver logs detallados de ejecuciones'),
  ('bpm:export_logs', 'BPM', 'EXPORT_LOGS', 'Exportar logs de auditoría')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 2. ASIGNAR PERMISOS A ROLES EXISTENTES
-- =====================================================

-- Administradores: Acceso completo a BPM
-- Usando el nombre del rol directamente en la columna "role"
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 
  'Admin',
  p.id
FROM "Permission" p
WHERE p.resource = 'BPM'
ON CONFLICT DO NOTHING;

-- Gestores: Permisos de lectura, ejecución y gestión básica
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 
  'Gestor',
  p.id
FROM "Permission" p
WHERE p.resource = 'BPM'
  AND p.action IN (
    'VIEW', 'VIEW_DETAILS', 'VIEW_HISTORY',
    'CREATE', 'EDIT', 'DUPLICATE',
    'EXECUTE', 'EXECUTE_MANUAL', 'CANCEL_EXECUTION',
    'VIEW_EVENTS', 'VIEW_ANALYTICS', 'VIEW_LOGS'
  )
ON CONFLICT DO NOTHING;

-- Supervisores: Permisos de lectura, ejecución y retry
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 
  'Supervisor',
  p.id
FROM "Permission" p
WHERE p.resource = 'BPM'
  AND p.action IN (
    'VIEW', 'VIEW_DETAILS', 'VIEW_HISTORY',
    'EXECUTE', 'EXECUTE_MANUAL', 'CANCEL_EXECUTION', 'RETRY_FAILED',
    'VIEW_EVENTS', 'VIEW_ANALYTICS', 'VIEW_LOGS'
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. VERIFICACIÓN
-- =====================================================

SELECT 
  'Permisos BPM creados' as info,
  COUNT(*)::text as cantidad
FROM "Permission"
WHERE resource = 'BPM'

UNION ALL

SELECT 
  'Permisos asignados a Admin' as info,
  COUNT(*)::text as cantidad
FROM "RolePermission" rp
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE rp.role = 'Admin'
  AND p.resource = 'BPM'

UNION ALL

SELECT 
  'Permisos asignados a Gestor' as info,
  COUNT(*)::text as cantidad
FROM "RolePermission" rp
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE rp.role = 'Gestor'
  AND p.resource = 'BPM'

UNION ALL

SELECT 
  'Permisos asignados a Supervisor' as info,
  COUNT(*)::text as cantidad
FROM "RolePermission" rp
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE rp.role = 'Supervisor'
  AND p.resource = 'BPM';
