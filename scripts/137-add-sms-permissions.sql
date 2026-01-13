-- Add SMS permissions to RBAC system
-- Created: 2026-01-07
-- Last updated: 2026-01-07 16:30h

-- Insert SMS permissions
INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('sms:dashboard:view', 'Ver dashboard de SMS', 'SMS', 'DASHBOARD_VIEW'),
  ('sms:templates:read', 'Ver plantillas de SMS', 'SMS', 'TEMPLATES_READ'),
  ('sms:templates:write', 'Crear y editar plantillas de SMS', 'SMS', 'TEMPLATES_WRITE'),
  ('sms:api:read', 'Ver configuración de API SMS', 'SMS', 'API_READ'),
  ('sms:api:write', 'Modificar configuración de API SMS', 'SMS', 'API_WRITE')
ON CONFLICT (name) DO NOTHING;

-- Assign all SMS permissions to admin and superadmin roles
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'admin', id FROM "Permission" 
WHERE resource = 'SMS'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'superadmin', id FROM "Permission" 
WHERE resource = 'SMS'
ON CONFLICT DO NOTHING;

-- Assign limited permissions to manager role (view only)
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'manager', id FROM "Permission" 
WHERE resource = 'SMS' AND action IN ('DASHBOARD_VIEW', 'TEMPLATES_READ')
ON CONFLICT DO NOTHING;
