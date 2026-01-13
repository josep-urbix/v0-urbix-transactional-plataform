-- =====================================================
-- Lemonway API Explorer Schema
-- =====================================================
-- Sistema completo para gestionar, probar y monitorear 
-- métodos de la API de Lemonway con historial y presets
-- =====================================================

-- Tabla: lemonway_api_methods
-- Registra todos los métodos disponibles de la API de Lemonway
CREATE TABLE IF NOT EXISTS "lemonway_api_methods" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  endpoint VARCHAR(255) NOT NULL,
  http_method VARCHAR(10) NOT NULL CHECK (http_method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  category VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Estado del método
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_implemented BOOLEAN NOT NULL DEFAULT false,
  
  -- Esquemas JSON
  request_schema JSONB,
  response_schema JSONB,
  
  -- Ejemplos
  example_request JSONB,
  example_response JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_lemonway_api_methods_category ON "lemonway_api_methods"(category);
CREATE INDEX IF NOT EXISTS idx_lemonway_api_methods_enabled ON "lemonway_api_methods"(is_enabled);
CREATE INDEX IF NOT EXISTS idx_lemonway_api_methods_implemented ON "lemonway_api_methods"(is_implemented);

-- Tabla: lemonway_api_call_history
-- Historial completo de todas las llamadas de prueba realizadas
CREATE TABLE IF NOT EXISTS "lemonway_api_call_history" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_id UUID NOT NULL REFERENCES "lemonway_api_methods"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  
  -- Datos de la llamada
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  
  -- Resultado
  status_code INTEGER,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para filtrado y búsqueda
CREATE INDEX IF NOT EXISTS idx_lemonway_api_call_history_method ON "lemonway_api_call_history"(method_id);
CREATE INDEX IF NOT EXISTS idx_lemonway_api_call_history_user ON "lemonway_api_call_history"(user_id);
CREATE INDEX IF NOT EXISTS idx_lemonway_api_call_history_created ON "lemonway_api_call_history"(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lemonway_api_call_history_success ON "lemonway_api_call_history"(success);

-- Tabla: lemonway_api_presets
-- Presets guardados por los usuarios para reutilizar parámetros
CREATE TABLE IF NOT EXISTS "lemonway_api_presets" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_id UUID NOT NULL REFERENCES "lemonway_api_methods"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  
  -- Datos del preset
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraint: Un usuario no puede tener dos presets con el mismo nombre para el mismo método
  UNIQUE(method_id, user_id, name)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lemonway_api_presets_method ON "lemonway_api_presets"(method_id);
CREATE INDEX IF NOT EXISTS idx_lemonway_api_presets_user ON "lemonway_api_presets"(user_id);

-- =====================================================
-- Datos iniciales: Métodos de API implementados
-- =====================================================

INSERT INTO "lemonway_api_methods" (name, endpoint, http_method, category, description, is_enabled, is_implemented, example_request, example_response) VALUES

-- Autenticación
('getBearerToken', '/oauth/api/v1/oauth/token', 'POST', 'Authentication', 'Obtiene un token Bearer OAuth 2.0 para autenticar las siguientes llamadas a la API. El token tiene una validez de 90 días.', true, true,
'{"Grant_type": "client_credentials"}'::jsonb,
'{"access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...", "token_type": "Bearer", "expires_in": 7776000}'::jsonb),

-- Cuentas
('getAccountDetails', '/accounts/retrieve', 'POST', 'Accounts', 'Obtiene los detalles completos de una cuenta específica de Lemonway por su accountId.', true, true,
'{"accountId": "WALLET123"}'::jsonb,
'{"account": {"accountId": "WALLET123", "email": "user@example.com", "balance": 1000.50, "currency": "EUR", "status": "ACTIVE"}}'::jsonb),

('getAccountsByIds', '/accounts/retrieve', 'POST', 'Accounts', 'Obtiene los detalles de múltiples cuentas en una sola llamada. Útil para sincronización masiva.', true, true,
'{"accountIds": ["WALLET123", "WALLET456"]}'::jsonb,
'{"accounts": [{"accountId": "WALLET123", "balance": 1000.50}, {"accountId": "WALLET456", "balance": 2500.00}]}'::jsonb),

('getKycStatus', '/accounts/kycstatus', 'GET', 'Accounts', 'Obtiene el estado de verificación KYC (Know Your Customer) de una cuenta. Indica si la cuenta está verificada para realizar operaciones.', true, true,
'{"accountId": "WALLET123"}'::jsonb,
'{"accountId": "WALLET123", "kycStatus": "APPROVED", "kycLevel": 2, "verifiedAt": "2024-01-15T10:30:00Z"}'::jsonb),

('getAccountBalances', '/accounts/balances', 'GET', 'Accounts', 'Obtiene los saldos actuales de todas las cuentas. Retorna balance disponible, bloqueado y total.', true, true,
'{}'::jsonb,
'{"balances": [{"accountId": "WALLET123", "available": 1000.50, "blocked": 0, "total": 1000.50}]}'::jsonb),

-- Transacciones
('getTransactions', '/transactions/list', 'POST', 'Transactions', 'Lista todas las transacciones de una cuenta con filtros opcionales por fecha, tipo y estado.', true, true,
'{"accountId": "WALLET123", "startDate": "2024-01-01", "endDate": "2024-01-31"}'::jsonb,
'{"transactions": [{"id": "TXN001", "amount": 100.00, "type": "money_in", "status": "completed", "date": "2024-01-15T10:00:00Z"}]}'::jsonb),

-- Métodos pendientes de implementación
('createWallet', '/accounts/create', 'POST', 'Accounts', 'Crea una nueva wallet en Lemonway con los datos del titular.', false, false,
'{"email": "user@example.com", "firstName": "John", "lastName": "Doe", "currency": "EUR"}'::jsonb,
'{"accountId": "WALLET789", "status": "CREATED"}'::jsonb),

('sendPayment', '/payments/send', 'POST', 'Payments', 'Envía un pago desde una wallet a otra dentro de Lemonway (transferencia P2P).', false, false,
'{"debitWallet": "WALLET123", "creditWallet": "WALLET456", "amount": 100.00, "currency": "EUR", "comment": "Payment for services"}'::jsonb,
'{"transactionId": "TXN123", "status": "pending", "amount": 100.00}'::jsonb);

-- =====================================================
-- Permisos RBAC para el módulo
-- =====================================================

-- Insertar permisos si no existen
INSERT INTO "Permission" (id, name, description, resource, action) VALUES
('lemonway-api-view', 'lemonway_api:view', 'Ver métodos de API de Lemonway y documentación', 'lemonway_api', 'view'),
('lemonway-api-test', 'lemonway_api:test', 'Ejecutar llamadas de prueba a la API de Lemonway', 'lemonway_api', 'test'),
('lemonway-api-toggle', 'lemonway_api:toggle', 'Activar o desactivar métodos de la API', 'lemonway_api', 'toggle'),
('lemonway-api-presets', 'lemonway_api:manage_presets', 'Crear, editar y eliminar presets de parámetros', 'lemonway_api', 'manage_presets')
ON CONFLICT (id) DO NOTHING;

-- Asignar permisos a superadmin
INSERT INTO "RolePermission" (role, "permissionId") VALUES
('superadmin', 'lemonway-api-view'),
('superadmin', 'lemonway-api-test'),
('superadmin', 'lemonway-api-toggle'),
('superadmin', 'lemonway-api-presets')
ON CONFLICT DO NOTHING;

-- Asignar permisos básicos a admin
INSERT INTO "RolePermission" (role, "permissionId") VALUES
('admin', 'lemonway-api-view'),
('admin', 'lemonway-api-test'),
('admin', 'lemonway-api-presets')
ON CONFLICT DO NOTHING;

-- Comentarios en las tablas
COMMENT ON TABLE "lemonway_api_methods" IS 'Métodos disponibles de la API de Lemonway con estado activo/inactivo';
COMMENT ON TABLE "lemonway_api_call_history" IS 'Historial completo de llamadas de prueba realizadas por usuarios';
COMMENT ON TABLE "lemonway_api_presets" IS 'Presets guardados por usuarios para reutilizar configuraciones de parámetros';

COMMENT ON COLUMN "lemonway_api_methods".is_enabled IS 'Si false, el método no puede ser usado desde ninguna parte del sistema';
COMMENT ON COLUMN "lemonway_api_methods".is_implemented IS 'Indica si el método ya está implementado en lemonway-client.ts';
