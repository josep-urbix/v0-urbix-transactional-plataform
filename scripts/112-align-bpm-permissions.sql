-- Script 112: Alinear permisos BPM con funcionalidades reales del módulo
-- Fecha: 2026-01-05
-- Descripción: Ajusta los permisos BPM para que coincidan con la UI y APIs existentes

-- =====================================================
-- 1. ELIMINAR PERMISOS QUE NO APLICAN AL MÓDULO ACTUAL
-- =====================================================

-- Primero eliminar asignaciones de estos permisos
DELETE FROM "RolePermission"
WHERE "permissionId" IN (
  SELECT id FROM "Permission" 
  WHERE name IN (
    'bpm:manage_templates',    -- No hay gestión de plantillas separada
    'bpm:manage_variables',    -- Variables están dentro de cada workflow
    'bpm:export',              -- No implementado actualmente
    'bpm:import',              -- No implementado actualmente
    'bpm:manage_integrations', -- No hay configuración de integraciones separada
    'bpm:export_logs'          -- No implementado actualmente
  )
);

-- Luego eliminar los permisos
DELETE FROM "Permission"
WHERE name IN (
  'bpm:manage_templates',
  'bpm:manage_variables', 
  'bpm:export',
  'bpm:import',
  'bpm:manage_integrations',
  'bpm:export_logs'
);

-- =====================================================
-- 2. RENOMBRAR/AJUSTAR PERMISOS EXISTENTES
-- =====================================================

-- Actualizar descripciones para que coincidan con la UI
UPDATE "Permission" SET description = 'Ver lista de procesos BPM' WHERE name = 'bpm:view';
UPDATE "Permission" SET description = 'Ver detalles y configuración de un proceso' WHERE name = 'bpm:view_details';
UPDATE "Permission" SET description = 'Ver historial de ejecuciones de procesos' WHERE name = 'bpm:view_history';
UPDATE "Permission" SET description = 'Crear nuevos procesos BPM' WHERE name = 'bpm:create';
UPDATE "Permission" SET description = 'Editar procesos existentes (steps, triggers, configuración)' WHERE name = 'bpm:edit';
UPDATE "Permission" SET description = 'Eliminar procesos BPM' WHERE name = 'bpm:delete';
UPDATE "Permission" SET description = 'Duplicar (clonar) procesos existentes' WHERE name = 'bpm:duplicate';
UPDATE "Permission" SET description = 'Activar procesos (cambiar estado a ACTIVE)' WHERE name = 'bpm:execute';
UPDATE "Permission" SET description = 'Ejecutar pruebas manuales de procesos' WHERE name = 'bpm:execute_manual';
UPDATE "Permission" SET description = 'Desactivar procesos (cambiar estado a INACTIVE)' WHERE name = 'bpm:cancel_execution';
UPDATE "Permission" SET description = 'Reintentar ejecuciones fallidas' WHERE name = 'bpm:retry_failed';
UPDATE "Permission" SET description = 'Ver eventos disponibles para triggers' WHERE name = 'bpm:view_events';
UPDATE "Permission" SET description = 'Crear y configurar eventos de trigger' WHERE name = 'bpm:create_events';
UPDATE "Permission" SET description = 'Editar eventos existentes' WHERE name = 'bpm:edit_events';
UPDATE "Permission" SET description = 'Eliminar eventos' WHERE name = 'bpm:delete_events';
UPDATE "Permission" SET description = 'Ver analytics y métricas de ejecuciones' WHERE name = 'bpm:view_analytics';
UPDATE "Permission" SET description = 'Ver logs detallados de ejecuciones' WHERE name = 'bpm:view_logs';

-- =====================================================
-- 3. AÑADIR NUEVOS PERMISOS ESPECÍFICOS DEL MÓDULO
-- =====================================================

INSERT INTO "Permission" (name, resource, action, description)
VALUES 
  -- Gestión de steps
  ('bpm:manage_steps', 'BPM', 'MANAGE_STEPS', 'Añadir, editar y eliminar steps de un proceso'),
  -- Gestión de triggers
  ('bpm:manage_triggers', 'BPM', 'MANAGE_TRIGGERS', 'Añadir, editar y eliminar triggers de un proceso'),
  -- Control de versiones
  ('bpm:view_versions', 'BPM', 'VIEW_VERSIONS', 'Ver historial de versiones del proceso'),
  -- Ejecuciones
  ('bpm:view_runs', 'BPM', 'VIEW_RUNS', 'Ver lista de ejecuciones de procesos'),
  ('bpm:view_run_details', 'BPM', 'VIEW_RUN_DETAILS', 'Ver detalles de una ejecución específica')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- =====================================================
-- 4. REASIGNAR PERMISOS A ROLES
-- =====================================================

-- Admin: Acceso completo a todos los permisos BPM
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'Admin', p.id
FROM "Permission" p
WHERE p.resource = 'BPM'
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp 
    WHERE rp.role = 'Admin' AND rp."permissionId" = p.id
  );

-- Gestor: Permisos de gestión operativa (sin eliminar)
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'Gestor', p.id
FROM "Permission" p
WHERE p.resource = 'BPM'
  AND p.action IN (
    'VIEW', 'VIEW_DETAILS', 'VIEW_HISTORY', 'VIEW_VERSIONS',
    'VIEW_RUNS', 'VIEW_RUN_DETAILS',
    'CREATE', 'EDIT', 'DUPLICATE',
    'MANAGE_STEPS', 'MANAGE_TRIGGERS',
    'EXECUTE', 'EXECUTE_MANUAL', 'CANCEL_EXECUTION',
    'VIEW_EVENTS', 'CREATE_EVENTS', 'EDIT_EVENTS',
    'VIEW_ANALYTICS', 'VIEW_LOGS'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp 
    WHERE rp.role = 'Gestor' AND rp."permissionId" = p.id
  );

-- Supervisor: Solo visualización y ejecución básica
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'Supervisor', p.id
FROM "Permission" p
WHERE p.resource = 'BPM'
  AND p.action IN (
    'VIEW', 'VIEW_DETAILS', 'VIEW_HISTORY', 'VIEW_VERSIONS',
    'VIEW_RUNS', 'VIEW_RUN_DETAILS',
    'EXECUTE_MANUAL', 'RETRY_FAILED',
    'VIEW_EVENTS',
    'VIEW_ANALYTICS', 'VIEW_LOGS'
  )
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp 
    WHERE rp.role = 'Supervisor' AND rp."permissionId" = p.id
  );

-- Analista: Solo lectura (nuevo rol si existe)
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'Analista', p.id
FROM "Permission" p
WHERE p.resource = 'BPM'
  AND p.action IN (
    'VIEW', 'VIEW_DETAILS', 'VIEW_HISTORY', 'VIEW_VERSIONS',
    'VIEW_RUNS', 'VIEW_RUN_DETAILS',
    'VIEW_EVENTS',
    'VIEW_ANALYTICS', 'VIEW_LOGS'
  )
  AND EXISTS (SELECT 1 FROM "Role" WHERE name = 'Analista')
  AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp 
    WHERE rp.role = 'Analista' AND rp."permissionId" = p.id
  );

-- =====================================================
-- 5. VERIFICACIÓN
-- =====================================================

SELECT 
  'Total permisos BPM' as info,
  COUNT(*)::text as cantidad
FROM "Permission"
WHERE resource = 'BPM'

UNION ALL

SELECT 
  'Admin - Permisos BPM' as info,
  COUNT(*)::text as cantidad
FROM "RolePermission" rp
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE rp.role = 'Admin' AND p.resource = 'BPM'

UNION ALL

SELECT 
  'Gestor - Permisos BPM' as info,
  COUNT(*)::text as cantidad
FROM "RolePermission" rp
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE rp.role = 'Gestor' AND p.resource = 'BPM'

UNION ALL

SELECT 
  'Supervisor - Permisos BPM' as info,
  COUNT(*)::text as cantidad
FROM "RolePermission" rp
JOIN "Permission" p ON rp."permissionId" = p.id
WHERE rp.role = 'Supervisor' AND p.resource = 'BPM';
