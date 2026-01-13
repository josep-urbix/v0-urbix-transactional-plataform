-- Create Permissions table
CREATE TABLE IF NOT EXISTS "Permission" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create RolePermissions junction table
CREATE TABLE IF NOT EXISTS "RolePermission" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "role" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL REFERENCES "Permission"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("role", "permissionId")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Permission_resource_idx" ON "Permission"("resource");
CREATE INDEX IF NOT EXISTS "Permission_action_idx" ON "Permission"("action");
CREATE INDEX IF NOT EXISTS "RolePermission_role_idx" ON "RolePermission"("role");
CREATE INDEX IF NOT EXISTS "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- Insert default permissions
INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('users.view', 'Ver listado de usuarios', 'users', 'view'),
  ('users.create', 'Crear nuevos usuarios', 'users', 'create'),
  ('users.update', 'Actualizar usuarios existentes', 'users', 'update'),
  ('users.delete', 'Eliminar usuarios', 'users', 'delete'),
  ('transactions.view', 'Ver transacciones', 'transactions', 'view'),
  ('transactions.export', 'Exportar transacciones', 'transactions', 'export'),
  ('settings.view', 'Ver configuración', 'settings', 'view'),
  ('settings.update', 'Modificar configuración', 'settings', 'update')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to admin role
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'admin', id FROM "Permission"
ON CONFLICT DO NOTHING;

-- Assign limited permissions to user role
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'user', id FROM "Permission" 
WHERE name IN ('transactions.view', 'settings.view')
ON CONFLICT DO NOTHING;
