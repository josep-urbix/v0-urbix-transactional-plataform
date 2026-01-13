-- =====================================================
-- Script 132: Añadir permisos RBAC para módulo documental
-- =====================================================
-- Eliminada columna 'category' que no existe en Permission
-- Usando solo las columnas existentes: id, name, action, resource, description, createdAt

-- Permisos para gestión de tipos de documentos
INSERT INTO "Permission" (id, name, action, resource, description, "createdAt")
VALUES 
  (gen_random_uuid(), 'documentos:tipos_ver', 'ver', 'documentos_tipos', 'Ver tipos de documentos', NOW()),
  (gen_random_uuid(), 'documentos:tipos_crear', 'crear', 'documentos_tipos', 'Crear tipos de documentos', NOW()),
  (gen_random_uuid(), 'documentos:tipos_editar', 'editar', 'documentos_tipos', 'Editar tipos de documentos', NOW()),
  (gen_random_uuid(), 'documentos:tipos_eliminar', 'eliminar', 'documentos_tipos', 'Eliminar tipos de documentos', NOW())
ON CONFLICT (name) DO NOTHING;

-- Permisos para gestión de versiones de documentos
INSERT INTO "Permission" (id, name, action, resource, description, "createdAt")
VALUES 
  (gen_random_uuid(), 'documentos:versiones_ver', 'ver', 'documentos_versiones', 'Ver versiones de documentos', NOW()),
  (gen_random_uuid(), 'documentos:versiones_crear', 'crear', 'documentos_versiones', 'Crear versiones de documentos', NOW()),
  (gen_random_uuid(), 'documentos:versiones_editar', 'editar', 'documentos_versiones', 'Editar versiones en borrador', NOW()),
  (gen_random_uuid(), 'documentos:versiones_publicar', 'publicar', 'documentos_versiones', 'Publicar versiones de documentos', NOW()),
  (gen_random_uuid(), 'documentos:versiones_retirar', 'retirar', 'documentos_versiones', 'Retirar versiones publicadas', NOW())
ON CONFLICT (name) DO NOTHING;

-- Permisos para monitoreo de firmas
INSERT INTO "Permission" (id, name, action, resource, description, "createdAt")
VALUES 
  (gen_random_uuid(), 'documentos:firmas_ver', 'ver', 'documentos_firmas', 'Ver sesiones de firma', NOW()),
  (gen_random_uuid(), 'documentos:firmas_reenviar', 'reenviar', 'documentos_firmas', 'Reenviar solicitudes de firma', NOW()),
  (gen_random_uuid(), 'documentos:firmas_cancelar', 'cancelar', 'documentos_firmas', 'Cancelar sesiones de firma', NOW())
ON CONFLICT (name) DO NOTHING;

-- Permisos para documentos firmados
INSERT INTO "Permission" (id, name, action, resource, description, "createdAt")
VALUES 
  (gen_random_uuid(), 'documentos:firmados_ver', 'ver', 'documentos_firmados', 'Ver documentos firmados', NOW()),
  (gen_random_uuid(), 'documentos:firmados_descargar', 'descargar', 'documentos_firmados', 'Descargar PDFs firmados', NOW())
ON CONFLICT (name) DO NOTHING;

-- Permisos para configuración de almacenamiento
INSERT INTO "Permission" (id, name, action, resource, description, "createdAt")
VALUES 
  (gen_random_uuid(), 'documentos:config_ver', 'ver', 'documentos_config', 'Ver configuración de documentos', NOW()),
  (gen_random_uuid(), 'documentos:config_editar', 'editar', 'documentos_config', 'Editar configuración de documentos', NOW())
ON CONFLICT (name) DO NOTHING;

-- Permisos para gestión de proyectos
INSERT INTO "Permission" (id, name, action, resource, description, "createdAt")
VALUES 
  (gen_random_uuid(), 'proyectos:ver', 'ver', 'proyectos', 'Ver proyectos', NOW()),
  (gen_random_uuid(), 'proyectos:crear', 'crear', 'proyectos', 'Crear proyectos', NOW()),
  (gen_random_uuid(), 'proyectos:editar', 'editar', 'proyectos', 'Editar proyectos', NOW()),
  (gen_random_uuid(), 'proyectos:eliminar', 'eliminar', 'proyectos', 'Eliminar proyectos', NOW()),
  (gen_random_uuid(), 'proyectos:publicar', 'publicar', 'proyectos', 'Publicar/despublicar proyectos', NOW()),
  (gen_random_uuid(), 'proyectos:comunicaciones', 'gestionar', 'proyectos_comunicaciones', 'Gestionar comunicaciones de proyectos', NOW())
ON CONFLICT (name) DO NOTHING;

-- Permisos para gestión de inversiones
INSERT INTO "Permission" (id, name, action, resource, description, "createdAt")
VALUES 
  (gen_random_uuid(), 'inversiones:ver', 'ver', 'inversiones', 'Ver inversiones', NOW()),
  (gen_random_uuid(), 'inversiones:crear', 'crear', 'inversiones', 'Crear inversiones manualmente', NOW()),
  (gen_random_uuid(), 'inversiones:editar', 'editar', 'inversiones', 'Editar inversiones', NOW()),
  (gen_random_uuid(), 'inversiones:cancelar', 'cancelar', 'inversiones', 'Cancelar inversiones', NOW()),
  (gen_random_uuid(), 'inversiones:aprobar', 'aprobar', 'inversiones', 'Aprobar inversiones pendientes', NOW()),
  (gen_random_uuid(), 'inversiones:rechazar', 'rechazar', 'inversiones', 'Rechazar inversiones', NOW()),
  (gen_random_uuid(), 'inversiones:historial', 'ver', 'inversiones_historial', 'Ver historial de cambios de inversiones', NOW())
ON CONFLICT (name) DO NOTHING;

-- Asignar TODOS los nuevos permisos al rol SuperAdmin automáticamente
INSERT INTO "RolePermission" (id, role, "permissionId", "createdAt")
SELECT 
  gen_random_uuid(),
  'superadmin',
  p.id,
  NOW()
FROM "Permission" p
WHERE p.resource IN (
    'documentos_tipos', 'documentos_versiones', 'documentos_firmas', 
    'documentos_firmados', 'documentos_config',
    'proyectos', 'proyectos_comunicaciones',
    'inversiones', 'inversiones_historial'
)
AND NOT EXISTS (
    SELECT 1 FROM "RolePermission" rp 
    WHERE rp.role = 'superadmin' AND rp."permissionId" = p.id
);

-- Verificar permisos creados
SELECT '=== PERMISOS DOCUMENTOS ===' as info;
SELECT name, description FROM "Permission" WHERE resource LIKE 'documentos%' ORDER BY name;

SELECT '=== PERMISOS PROYECTOS ===' as info;
SELECT name, description FROM "Permission" WHERE resource LIKE 'proyectos%' ORDER BY name;

SELECT '=== PERMISOS INVERSIONES ===' as info;
SELECT name, description FROM "Permission" WHERE resource LIKE 'inversiones%' ORDER BY name;

SELECT '=== TOTAL PERMISOS SUPERADMIN ===' as info;
SELECT COUNT(*) as total_permisos FROM "RolePermission" WHERE role = 'superadmin';
