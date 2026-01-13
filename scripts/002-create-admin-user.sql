-- Create admin user with bcrypt-hashed password
-- IMPORTANT: Change the password after first login in production!
-- To create a new admin user:
-- 1. Generate password hash: Use the create-test-user.ts script
-- 2. Insert user with the generated hash
-- Default password hash is for a secure random password - you MUST change this

INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "isActive", "createdAt")
VALUES (
  gen_random_uuid()::text,
  'admin@urbix.es',
  'Administrador',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4edFZP.VR9D.5Emu',
  'admin',
  true,
  NOW()
)
ON CONFLICT ("email") DO NOTHING;

-- NOTE: For security, the default password is NOT documented here
-- Contact your system administrator for initial credentials
