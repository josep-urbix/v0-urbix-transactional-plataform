-- Script 116: Añadir todos los permisos faltantes al sistema
-- Fecha: 2026-01-05
-- Descripción: Script consolidado con todos los permisos necesarios

-- =====================================================
-- 1. PERMISOS BASE DEL SISTEMA
-- =====================================================

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

-- =====================================================
-- 2. PERMISOS DE EMAIL Y CRON
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('emails.templates.view', 'Ver plantillas de email', 'emails', 'view'),
  ('emails.templates.create', 'Crear plantillas de email', 'emails', 'create'),
  ('emails.templates.update', 'Actualizar plantillas de email', 'emails', 'update'),
  ('emails.templates.delete', 'Eliminar plantillas de email', 'emails', 'delete'),
  ('emails.send', 'Enviar emails', 'emails', 'send'),
  ('emails.history.view', 'Ver historial de emails enviados', 'emails', 'history'),
  ('cron.view', 'Ver tareas programadas', 'cron', 'view'),
  ('cron.manage', 'Gestionar tareas programadas', 'cron', 'manage')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 3. PERMISOS DE PAYMENT ACCOUNTS
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('payment_accounts.view', 'Ver cuentas de pago', 'payment_accounts', 'view'),
  ('payment_accounts.create', 'Crear cuentas de pago', 'payment_accounts', 'create'),
  ('payment_accounts.update', 'Actualizar cuentas de pago', 'payment_accounts', 'update'),
  ('payment_accounts.sync', 'Sincronizar cuentas de pago', 'payment_accounts', 'sync')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 4. PERMISOS DE FIELD MAPPINGS
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('field_mappings.view', 'Ver mapeos de campos', 'field_mappings', 'view'),
  ('field_mappings.manage', 'Gestionar mapeos de campos', 'field_mappings', 'manage')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 5. PERMISOS DE ROLES Y RBAC
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('roles.view', 'Ver roles del sistema', 'roles', 'view'),
  ('roles.manage', 'Gestionar roles y permisos', 'roles', 'manage')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 6. PERMISOS DE SQL LOGS
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('sql_logs.view', 'Ver logs de transacciones SQL', 'sql_logs', 'view'),
  ('sql_logs.execute', 'Ejecutar consultas SQL', 'sql_logs', 'execute')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 7. PERMISOS DE LEMONWAY
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('lemonway.config.view', 'Ver configuración de Lemonway', 'lemonway', 'view'),
  ('lemonway.config.update', 'Actualizar configuración de Lemonway', 'lemonway', 'update'),
  ('lemonway.transactions.view', 'Ver transacciones de Lemonway', 'lemonway', 'transactions'),
  ('lemonway.transactions.retry', 'Reintentar transacciones fallidas', 'lemonway', 'retry'),
  ('lemonway.sync', 'Sincronizar datos con Lemonway', 'lemonway', 'sync')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 8. PERMISOS DE WALLETS
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('wallets.view', 'Ver wallets', 'wallets', 'view'),
  ('wallets.create', 'Crear wallets', 'wallets', 'create'),
  ('wallets.update', 'Actualizar wallets', 'wallets', 'update'),
  ('wallets.transactions', 'Ver transacciones de wallets', 'wallets', 'transactions')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 9. PERMISOS DE APP SETTINGS
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('app_settings.view', 'Ver configuración de aplicación', 'app_settings', 'view'),
  ('app_settings.update', 'Actualizar configuración de aplicación', 'app_settings', 'update')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 10. PERMISOS DE CUENTAS VIRTUALES
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('virtual_accounts.view', 'Ver cuentas virtuales', 'VIRTUAL_ACCOUNTS', 'VIEW_ACCOUNTS'),
  ('virtual_accounts.view_detail', 'Ver detalle de cuenta virtual', 'VIRTUAL_ACCOUNTS', 'VIEW_ACCOUNT_DETAIL'),
  ('virtual_accounts.view_movements', 'Ver movimientos de cuenta', 'VIRTUAL_ACCOUNTS', 'VIEW_MOVEMENTS'),
  ('virtual_accounts.manage_operation_types', 'Gestionar tipos de operación contable', 'VIRTUAL_ACCOUNTS', 'MANAGE_OPERATION_TYPES'),
  ('virtual_accounts.create_manual_adjustment', 'Crear solicitud de ajuste manual', 'VIRTUAL_ACCOUNTS', 'CREATE_MANUAL_ADJUSTMENT'),
  ('virtual_accounts.approve_manual_adjustment', 'Aprobar ajuste manual', 'VIRTUAL_ACCOUNTS', 'APPROVE_MANUAL_ADJUSTMENT'),
  ('virtual_accounts.view_lemonway_data', 'Ver datos de Lemonway', 'VIRTUAL_ACCOUNTS', 'VIEW_LEMONWAY_DATA'),
  ('virtual_accounts.link_wallet', 'Vincular wallet Lemonway a cuenta virtual', 'VIRTUAL_ACCOUNTS', 'LINK_WALLET'),
  ('virtual_accounts.unblock', 'Desbloquear cuentas virtuales', 'VIRTUAL_ACCOUNTS', 'UNBLOCK')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 11. PERMISOS DE TAREAS
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  ('tasks.view', 'Ver tareas', 'TASKS', 'VIEW'),
  ('tasks.create', 'Crear tareas', 'TASKS', 'CREATE'),
  ('tasks.complete', 'Completar tareas', 'TASKS', 'COMPLETE'),
  ('tasks.assign', 'Asignar tareas', 'TASKS', 'ASSIGN'),
  ('tasks.view_details', 'Ver detalles de tarea', 'TASKS', 'VIEW_DETAILS'),
  ('tasks.update', 'Actualizar tareas', 'TASKS', 'UPDATE'),
  ('tasks.delete', 'Eliminar tareas', 'TASKS', 'DELETE'),
  ('tasks.manage_types', 'Gestionar tipos de tarea', 'TASKS', 'MANAGE_TYPES'),
  ('tasks.manage_sla', 'Gestionar configuración SLA', 'TASKS', 'MANAGE_SLA'),
  ('tasks.view_statistics', 'Ver estadísticas de tareas', 'TASKS', 'VIEW_STATISTICS'),
  ('tasks.escalate', 'Escalar tareas', 'TASKS', 'ESCALATE')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 12. PERMISOS DE BPM (Business Process Manager)
-- =====================================================

INSERT INTO "Permission" (name, description, resource, action) VALUES
  -- Lectura
  ('bpm.list', 'Listar procesos', 'BPM', 'LIST'),
  ('bpm.view', 'Ver detalles de proceso', 'BPM', 'VIEW'),
  ('bpm.view_executions', 'Ver ejecuciones', 'BPM', 'VIEW_EXECUTIONS'),
  ('bpm.view_execution_details', 'Ver detalles de ejecución', 'BPM', 'VIEW_EXECUTION_DETAILS'),
  ('bpm.view_versions', 'Ver versiones', 'BPM', 'VIEW_VERSIONS'),
  -- Escritura
  ('bpm.create', 'Crear procesos', 'BPM', 'CREATE'),
  ('bpm.update', 'Editar procesos', 'BPM', 'UPDATE'),
  ('bpm.delete', 'Eliminar procesos', 'BPM', 'DELETE'),
  ('bpm.manage_steps', 'Gestionar pasos', 'BPM', 'MANAGE_STEPS'),
  ('bpm.manage_triggers', 'Gestionar triggers', 'BPM', 'MANAGE_TRIGGERS'),
  -- Ejecución
  ('bpm.execute', 'Ejecutar procesos', 'BPM', 'EXECUTE'),
  ('bpm.cancel', 'Cancelar ejecuciones', 'BPM', 'CANCEL'),
  ('bpm.retry', 'Reintentar ejecuciones', 'BPM', 'RETRY'),
  ('bpm.schedule', 'Programar ejecuciones', 'BPM', 'SCHEDULE'),
  -- Eventos
  ('bpm.view_events', 'Ver eventos', 'BPM', 'VIEW_EVENTS'),
  ('bpm.manage_events', 'Gestionar eventos', 'BPM', 'MANAGE_EVENTS'),
  -- Configuración
  ('bpm.manage_schedules', 'Gestionar programaciones', 'BPM', 'MANAGE_SCHEDULES'),
  -- Avanzado
  ('bpm.view_analytics', 'Ver analíticas', 'BPM', 'VIEW_ANALYTICS')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 13. VERIFICACIÓN
-- =====================================================

SELECT 
  'Total permisos en sistema' as info,
  COUNT(*)::text as cantidad
FROM "Permission"

UNION ALL

SELECT 
  'Permisos BPM' as info,
  COUNT(*)::text as cantidad
FROM "Permission"
WHERE resource = 'BPM'

UNION ALL

SELECT 
  'Permisos TASKS' as info,
  COUNT(*)::text as cantidad
FROM "Permission"
WHERE resource = 'TASKS'

UNION ALL

SELECT 
  'Permisos VIRTUAL_ACCOUNTS' as info,
  COUNT(*)::text as cantidad
FROM "Permission"
WHERE resource = 'VIRTUAL_ACCOUNTS';
