-- Corrected to use actual Permission table columns: name, resource, action, description
-- Add missing users permissions
-- This ensures the users management screen works correctly

-- Insert users permissions
INSERT INTO "Permission" (id, name, resource, action, description, "createdAt")
VALUES 
  (gen_random_uuid()::text, 'users.read', 'users', 'read', 'Ver lista de usuarios del sistema', NOW()),
  (gen_random_uuid()::text, 'users.create', 'users', 'create', 'Crear nuevos usuarios', NOW()),
  (gen_random_uuid()::text, 'users.update', 'users', 'update', 'Modificar usuarios existentes', NOW()),
  (gen_random_uuid()::text, 'users.delete', 'users', 'delete', 'Eliminar usuarios del sistema', NOW()),
  (gen_random_uuid()::text, 'users.view', 'users', 'view', 'Ver lista de usuarios (usado en API)', NOW())
ON CONFLICT (name) DO NOTHING;

-- Assign to Admin role
INSERT INTO "RolePermission" (id, role, "permissionId", "createdAt")
SELECT gen_random_uuid()::text, 'Admin', p.id, NOW()
FROM "Permission" p
WHERE p.name IN ('users.read', 'users.create', 'users.update', 'users.delete', 'users.view')
ON CONFLICT DO NOTHING;

-- Assign read-only to Gestor role
INSERT INTO "RolePermission" (id, role, "permissionId", "createdAt")
SELECT gen_random_uuid()::text, 'Gestor', p.id, NOW()
FROM "Permission" p
WHERE p.name IN ('users.read', 'users.view')
ON CONFLICT DO NOTHING;

-- Return confirmation
SELECT 
  'Permisos de usuarios agregados' as info,
  COUNT(*) as cantidad
FROM "Permission"
WHERE resource = 'users';
