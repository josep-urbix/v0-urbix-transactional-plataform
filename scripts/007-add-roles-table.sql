-- Create Roles table to store custom roles
CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT UNIQUE NOT NULL,
  "displayName" TEXT NOT NULL,
  "description" TEXT,
  "isSystem" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS "Role_name_idx" ON "Role"("name");

-- Insert default system roles
INSERT INTO "Role" (name, "displayName", description, "isSystem") VALUES
  ('admin', 'Administrador', 'Acceso completo al sistema', true),
  ('user', 'Usuario', 'Acceso básico al sistema', true)
ON CONFLICT (name) DO NOTHING;
