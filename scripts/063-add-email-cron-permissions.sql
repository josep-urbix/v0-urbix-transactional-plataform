-- Add email permissions
INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('emails.templates.view', 'Ver plantillas de email', 'emails', 'view'),
  ('emails.templates.create', 'Crear plantillas de email', 'emails', 'create'),
  ('emails.templates.update', 'Actualizar plantillas de email', 'emails', 'update'),
  ('emails.templates.delete', 'Eliminar plantillas de email', 'emails', 'delete'),
  ('emails.send', 'Enviar emails', 'emails', 'send'),
  ('emails.history.view', 'Ver historial de emails enviados', 'emails', 'history'),
  ('cron.view', 'Ver tareas programadas', 'cron', 'view'),
  ('cron.manage', 'Gestionar tareas programadas', 'cron', 'manage'),
  ('payment_accounts.view', 'Ver cuentas de pago', 'payment_accounts', 'view'),
  ('payment_accounts.create', 'Crear cuentas de pago', 'payment_accounts', 'create'),
  ('payment_accounts.update', 'Actualizar cuentas de pago', 'payment_accounts', 'update'),
  ('payment_accounts.sync', 'Sincronizar cuentas de pago', 'payment_accounts', 'sync'),
  ('field_mappings.view', 'Ver mapeos de campos', 'field_mappings', 'view'),
  ('field_mappings.manage', 'Gestionar mapeos de campos', 'field_mappings', 'manage'),
  ('roles.view', 'Ver roles del sistema', 'roles', 'view'),
  ('roles.manage', 'Gestionar roles y permisos', 'roles', 'manage'),
  -- Adding transactions SQL permissions
  ('sql_logs.view', 'Ver logs de transacciones SQL', 'sql_logs', 'view'),
  ('sql_logs.execute', 'Ejecutar consultas SQL', 'sql_logs', 'execute'),
  -- Adding Lemonway permissions
  ('lemonway.config.view', 'Ver configuración de Lemonway', 'lemonway', 'view'),
  ('lemonway.config.update', 'Actualizar configuración de Lemonway', 'lemonway', 'update'),
  ('lemonway.transactions.view', 'Ver transacciones de Lemonway', 'lemonway', 'transactions'),
  ('lemonway.transactions.retry', 'Reintentar transacciones fallidas', 'lemonway', 'retry'),
  ('lemonway.sync', 'Sincronizar datos con Lemonway', 'lemonway', 'sync'),
  -- Adding Wallets permissions
  ('wallets.view', 'Ver wallets', 'wallets', 'view'),
  ('wallets.create', 'Crear wallets', 'wallets', 'create'),
  ('wallets.update', 'Actualizar wallets', 'wallets', 'update'),
  ('wallets.transactions', 'Ver transacciones de wallets', 'wallets', 'transactions'),
  -- Adding App Settings permissions
  ('app_settings.view', 'Ver configuración de aplicación', 'app_settings', 'view'),
  ('app_settings.update', 'Actualizar configuración de aplicación', 'app_settings', 'update'),
  -- Adding Users management permissions
  ('users.view', 'Ver usuarios', 'users', 'view'),
  ('users.create', 'Crear usuarios', 'users', 'create'),
  ('users.update', 'Actualizar usuarios', 'users', 'update'),
  ('users.delete', 'Eliminar usuarios', 'users', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Assign new permissions to admin role
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'admin', id FROM "Permission"
WHERE name IN (
  'emails.templates.view',
  'emails.templates.create',
  'emails.templates.update',
  'emails.templates.delete',
  'emails.send',
  'emails.history.view',
  'cron.view',
  'cron.manage',
  'payment_accounts.view',
  'payment_accounts.create',
  'payment_accounts.update',
  'payment_accounts.sync',
  'field_mappings.view',
  'field_mappings.manage',
  'roles.view',
  'roles.manage',
  -- New permissions for admin
  'sql_logs.view',
  'sql_logs.execute',
  'lemonway.config.view',
  'lemonway.config.update',
  'lemonway.transactions.view',
  'lemonway.transactions.retry',
  'lemonway.sync',
  'wallets.view',
  'wallets.create',
  'wallets.update',
  'wallets.transactions',
  'app_settings.view',
  'app_settings.update',
  'users.view',
  'users.create',
  'users.update',
  'users.delete'
)
ON CONFLICT DO NOTHING;

-- Assign view-only permissions to user role
INSERT INTO "RolePermission" (role, "permissionId")
SELECT 'user', id FROM "Permission"
WHERE name IN (
  'emails.history.view',
  'payment_accounts.view',
  'field_mappings.view',
  -- View-only permissions for user role
  'lemonway.transactions.view',
  'wallets.view',
  'wallets.transactions'
)
ON CONFLICT DO NOTHING;
