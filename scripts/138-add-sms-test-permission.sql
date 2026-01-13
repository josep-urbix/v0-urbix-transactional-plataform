-- Add missing SMS test permission
-- Created: 2026-01-07

-- Insert SMS send test permission
INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('sms_send_test', 'Enviar SMS de prueba', 'SMS', 'SEND_TEST')
ON CONFLICT (name) DO NOTHING;

-- Assign to admin and superadmin roles
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'admin', id FROM "Permission" 
WHERE name = 'sms_send_test'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'superadmin', id FROM "Permission" 
WHERE name = 'sms_send_test'
ON CONFLICT DO NOTHING;
