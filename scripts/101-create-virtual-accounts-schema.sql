-- =====================================================
-- VIRTUAL ACCOUNTS MODULE - DATABASE SCHEMA
-- =====================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS virtual_accounts;

-- =====================================================
-- PART 1: CORE LEDGER TABLES
-- =====================================================

-- Account types enum
CREATE TYPE virtual_accounts.tipo_cuenta AS ENUM (
  'INVERSOR',
  'PROMOTOR',
  'PROYECTO',
  'PLATAFORMA_COMISIONES',
  'PLATAFORMA_FONDOS_TRANSITO'
);

-- Account status enum
CREATE TYPE virtual_accounts.estado_cuenta AS ENUM (
  'ACTIVA',
  'BLOQUEADA',
  'CERRADA'
);

-- 1. Virtual Accounts (Cuentas Virtuales)
CREATE TABLE IF NOT EXISTS virtual_accounts.cuentas_virtuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo virtual_accounts.tipo_cuenta NOT NULL,
  referencia_externa_tipo VARCHAR(100) NOT NULL,
  referencia_externa_id VARCHAR(255) NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'EUR',
  saldo_disponible DECIMAL(19, 4) NOT NULL DEFAULT 0,
  saldo_bloqueado DECIMAL(19, 4) NOT NULL DEFAULT 0,
  estado virtual_accounts.estado_cuenta NOT NULL DEFAULT 'ACTIVA',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cuentas_virtuales_tipo ON virtual_accounts.cuentas_virtuales(tipo);
CREATE INDEX idx_cuentas_virtuales_estado ON virtual_accounts.cuentas_virtuales(estado);
CREATE INDEX idx_cuentas_virtuales_referencia ON virtual_accounts.cuentas_virtuales(referencia_externa_tipo, referencia_externa_id);
CREATE UNIQUE INDEX idx_cuentas_virtuales_unique_ref ON virtual_accounts.cuentas_virtuales(tipo, referencia_externa_tipo, referencia_externa_id, moneda);

-- 2. Operation Types Catalog (Tipos de Operación Contable)
CREATE TABLE IF NOT EXISTS virtual_accounts.tipos_operacion_contable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(100) NOT NULL UNIQUE,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  afecta_saldo_disponible BOOLEAN NOT NULL DEFAULT true,
  afecta_saldo_bloqueado BOOLEAN NOT NULL DEFAULT false,
  signo_saldo_disponible VARCHAR(1) CHECK (signo_saldo_disponible IN ('+', '-', '0')),
  signo_saldo_bloqueado VARCHAR(1) CHECK (signo_saldo_bloqueado IN ('+', '-', '0')),
  visible_para_inversor BOOLEAN NOT NULL DEFAULT true,
  requiere_aprobacion BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  orden_visual INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tipos_operacion_codigo ON virtual_accounts.tipos_operacion_contable(codigo);
CREATE INDEX idx_tipos_operacion_activo ON virtual_accounts.tipos_operacion_contable(activo);

-- 3. Account Movements (Movimientos de Cuenta)
CREATE TABLE IF NOT EXISTS virtual_accounts.movimientos_cuenta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id UUID NOT NULL REFERENCES virtual_accounts.cuentas_virtuales(id),
  tipo_operacion_id UUID NOT NULL REFERENCES virtual_accounts.tipos_operacion_contable(id),
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  importe DECIMAL(19, 4) NOT NULL CHECK (importe > 0),
  moneda VARCHAR(3) NOT NULL DEFAULT 'EUR',
  saldo_disponible_resultante DECIMAL(19, 4) NOT NULL,
  saldo_bloqueado_resultante DECIMAL(19, 4) NOT NULL,
  proyecto_id UUID,
  inversion_id UUID,
  usuario_externo_id UUID,
  promotor_id UUID,
  origen VARCHAR(50) NOT NULL,
  descripcion TEXT,
  workflow_run_id UUID,
  idempotency_key VARCHAR(255),
  created_by_admin_id TEXT,
  created_by_type VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movimientos_cuenta_id ON virtual_accounts.movimientos_cuenta(cuenta_id, fecha DESC);
CREATE INDEX idx_movimientos_tipo_operacion ON virtual_accounts.movimientos_cuenta(tipo_operacion_id);
CREATE INDEX idx_movimientos_fecha ON virtual_accounts.movimientos_cuenta(fecha DESC);
CREATE INDEX idx_movimientos_proyecto ON virtual_accounts.movimientos_cuenta(proyecto_id);
CREATE INDEX idx_movimientos_inversion ON virtual_accounts.movimientos_cuenta(inversion_id);
CREATE INDEX idx_movimientos_usuario ON virtual_accounts.movimientos_cuenta(usuario_externo_id);
CREATE UNIQUE INDEX idx_movimientos_idempotency ON virtual_accounts.movimientos_cuenta(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- =====================================================
-- PART 2: SEED DATA - INITIAL OPERATION TYPES
-- =====================================================

INSERT INTO virtual_accounts.tipos_operacion_contable (codigo, nombre, descripcion, afecta_saldo_disponible, afecta_saldo_bloqueado, signo_saldo_disponible, signo_saldo_bloqueado, visible_para_inversor, requiere_aprobacion, orden_visual)
VALUES
  ('INGRESO_EXTERNO', 'Ingreso Externo', 'Fondos entrantes desde fuente externa (transferencia, tarjeta, etc.)', true, false, '+', '0', true, false, 10),
  ('RETIRADA_EXTERNA', 'Retirada Externa', 'Fondos salientes hacia cuenta externa del usuario', true, false, '-', '0', true, false, 20),
  ('RESERVA_INVERSION', 'Reserva para Inversión', 'Fondos bloqueados para una inversión pendiente de ejecución', true, true, '-', '+', true, false, 30),
  ('EJECUCION_INVERSION_INVERSOR', 'Ejecución Inversión (Inversor)', 'Desbloqueo fondos reservados tras ejecutar inversión', false, true, '0', '-', true, false, 40),
  ('EJECUCION_INVERSION_PROYECTO', 'Ejecución Inversión (Proyecto)', 'Fondos recibidos en cuenta del proyecto desde inversores', true, false, '+', '0', false, false, 50),
  ('REEMBOLSO_INVERSION', 'Reembolso de Inversión', 'Devolución de fondos de una inversión cancelada o finalizada', true, false, '+', '0', true, false, 60),
  ('COBRO_COMISION', 'Cobro de Comisión', 'Comisión cobrada por la plataforma', true, false, '-', '0', true, false, 70),
  ('AJUSTE_MANUAL', 'Ajuste Manual', 'Corrección manual de saldo (requiere aprobación)', true, false, '+', '0', false, true, 100)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- PART 3: LEMONWAY DATA MODEL (no integration yet)
-- =====================================================

CREATE SCHEMA IF NOT EXISTS lemonway;

-- 1. Lemonway Wallets
CREATE TABLE IF NOT EXISTS lemonway.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ext_id VARCHAR(255) NOT NULL UNIQUE,
  int_id VARCHAR(255) UNIQUE,
  owner_tipo VARCHAR(50),
  owner_id VARCHAR(255),
  cuenta_virtual_id UUID REFERENCES virtual_accounts.cuentas_virtuales(id),
  status VARCHAR(50),
  blocked BOOLEAN NOT NULL DEFAULT false,
  blocking_reasons JSONB,
  moneda VARCHAR(3) NOT NULL DEFAULT 'EUR',
  kyc_level VARCHAR(50),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lemonway_wallets_ext_id ON lemonway.wallets(ext_id);
CREATE INDEX idx_lemonway_wallets_owner ON lemonway.wallets(owner_tipo, owner_id);
CREATE INDEX idx_lemonway_wallets_cuenta_virtual ON lemonway.wallets(cuenta_virtual_id);

-- 2. Lemonway Wallet Status History
CREATE TABLE IF NOT EXISTS lemonway.wallet_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES lemonway.wallets(id),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  old_blocked BOOLEAN,
  new_blocked BOOLEAN,
  reason_id INTEGER,
  blocking BOOLEAN,
  blocking_reasons_snapshot JSONB,
  notif_category INTEGER,
  notif_date TIMESTAMP,
  source VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_status_history_wallet ON lemonway.wallet_status_history(wallet_id, created_at DESC);

-- 3. Lemonway Transactions
CREATE TABLE IF NOT EXISTS lemonway.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_transaction VARCHAR(255) UNIQUE,
  psp_transaction_id VARCHAR(255),
  merchant_token VARCHAR(255),
  tipo_operacion VARCHAR(100),
  notif_category INTEGER,
  payment_method_code INTEGER,
  direction VARCHAR(10) CHECK (direction IN ('IN', 'OUT', 'INTERNAL')),
  amount DECIMAL(19, 4),
  currency VARCHAR(3),
  fees DECIMAL(19, 4),
  amount_net DECIMAL(19, 4),
  wallet_debited_ext_id VARCHAR(255),
  wallet_credited_ext_id VARCHAR(255),
  wallet_debited_id UUID REFERENCES lemonway.wallets(id),
  wallet_credited_id UUID REFERENCES lemonway.wallets(id),
  status_code VARCHAR(50),
  status_normalizado VARCHAR(50),
  execution_date TIMESTAMP,
  notif_date_last TIMESTAMP,
  inversion_id UUID,
  proyecto_id UUID,
  usuario_externo_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lemonway_transactions_id_transaction ON lemonway.transactions(id_transaction);
CREATE INDEX idx_lemonway_transactions_wallet_debited ON lemonway.transactions(wallet_debited_id);
CREATE INDEX idx_lemonway_transactions_wallet_credited ON lemonway.transactions(wallet_credited_id);
CREATE INDEX idx_lemonway_transactions_date ON lemonway.transactions(execution_date DESC);

-- 4. Lemonway Documents
CREATE TABLE IF NOT EXISTS lemonway.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES lemonway.wallets(id),
  doc_id VARCHAR(255) NOT NULL,
  doc_type VARCHAR(100),
  status VARCHAR(50),
  last_status_change_at TIMESTAMP,
  last_notif_category INTEGER,
  last_notif_date TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lemonway_documents_wallet ON lemonway.documents(wallet_id);
CREATE INDEX idx_lemonway_documents_doc_id ON lemonway.documents(doc_id);

-- 5. Lemonway Payment Methods Catalog
CREATE TABLE IF NOT EXISTS lemonway.payment_methods (
  code INTEGER PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Lemonway Status Codes Catalog
CREATE TABLE IF NOT EXISTS lemonway.status_codes (
  code VARCHAR(50) PRIMARY KEY,
  grupo VARCHAR(50),
  estado_normalizado VARCHAR(50),
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- PART 4: RBAC - Using existing Role/Permission tables
-- =====================================================

-- Insert Virtual Accounts permissions into existing Permission table
INSERT INTO public."Permission" (id, resource, action, name, description, "createdAt")
SELECT 
  gen_random_uuid()::text, 
  'VIRTUAL_ACCOUNTS', 
  'VIEW_ACCOUNTS', 
  'Ver Cuentas Virtuales', 
  'Ver cuentas virtuales', 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM public."Permission" 
  WHERE resource = 'VIRTUAL_ACCOUNTS' AND action = 'VIEW_ACCOUNTS'
);

INSERT INTO public."Permission" (id, resource, action, name, description, "createdAt")
SELECT 
  gen_random_uuid()::text, 
  'VIRTUAL_ACCOUNTS', 
  'VIEW_ACCOUNT_DETAIL', 
  'Ver Detalle de Cuenta', 
  'Ver detalle de cuenta virtual', 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM public."Permission" 
  WHERE resource = 'VIRTUAL_ACCOUNTS' AND action = 'VIEW_ACCOUNT_DETAIL'
);

INSERT INTO public."Permission" (id, resource, action, name, description, "createdAt")
SELECT 
  gen_random_uuid()::text, 
  'VIRTUAL_ACCOUNTS', 
  'VIEW_MOVEMENTS', 
  'Ver Movimientos', 
  'Ver movimientos de cuenta', 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM public."Permission" 
  WHERE resource = 'VIRTUAL_ACCOUNTS' AND action = 'VIEW_MOVEMENTS'
);

INSERT INTO public."Permission" (id, resource, action, name, description, "createdAt")
SELECT 
  gen_random_uuid()::text, 
  'VIRTUAL_ACCOUNTS', 
  'MANAGE_OPERATION_TYPES', 
  'Gestionar Tipos Operación', 
  'Gestionar tipos de operación contable', 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM public."Permission" 
  WHERE resource = 'VIRTUAL_ACCOUNTS' AND action = 'MANAGE_OPERATION_TYPES'
);

INSERT INTO public."Permission" (id, resource, action, name, description, "createdAt")
SELECT 
  gen_random_uuid()::text, 
  'VIRTUAL_ACCOUNTS', 
  'CREATE_MANUAL_ADJUSTMENT', 
  'Crear Ajuste Manual', 
  'Crear solicitud de ajuste manual', 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM public."Permission" 
  WHERE resource = 'VIRTUAL_ACCOUNTS' AND action = 'CREATE_MANUAL_ADJUSTMENT'
);

INSERT INTO public."Permission" (id, resource, action, name, description, "createdAt")
SELECT 
  gen_random_uuid()::text, 
  'VIRTUAL_ACCOUNTS', 
  'APPROVE_MANUAL_ADJUSTMENT', 
  'Aprobar Ajuste Manual', 
  'Aprobar ajuste manual', 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM public."Permission" 
  WHERE resource = 'VIRTUAL_ACCOUNTS' AND action = 'APPROVE_MANUAL_ADJUSTMENT'
);

INSERT INTO public."Permission" (id, resource, action, name, description, "createdAt")
SELECT 
  gen_random_uuid()::text, 
  'VIRTUAL_ACCOUNTS', 
  'VIEW_LEMONWAY_DATA', 
  'Ver Datos Lemonway', 
  'Ver datos de Lemonway', 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM public."Permission" 
  WHERE resource = 'VIRTUAL_ACCOUNTS' AND action = 'VIEW_LEMONWAY_DATA'
);

INSERT INTO public."Permission" (id, resource, action, name, description, "createdAt")
SELECT 
  gen_random_uuid()::text, 
  'VIRTUAL_ACCOUNTS', 
  'LINK_WALLET', 
  'Vincular Wallet', 
  'Vincular wallet Lemonway a cuenta virtual', 
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM public."Permission" 
  WHERE resource = 'VIRTUAL_ACCOUNTS' AND action = 'LINK_WALLET'
);

-- Grant Virtual Accounts permissions to Admin role
DO $$
DECLARE
  admin_role_id TEXT;
  perm_id TEXT;
BEGIN
  -- Find Admin role
  SELECT id INTO admin_role_id FROM public."Role" WHERE name = 'Admin' OR "displayName" = 'Admin' LIMIT 1;
  
  IF admin_role_id IS NOT NULL THEN
    -- Grant all VIRTUAL_ACCOUNTS permissions to Admin role
    FOR perm_id IN 
      SELECT id FROM public."Permission" WHERE resource = 'VIRTUAL_ACCOUNTS'
    LOOP
      -- Check if permission already exists before inserting
      IF NOT EXISTS (
        SELECT 1 FROM public."RolePermission" 
        WHERE role = admin_role_id AND "permissionId" = perm_id
      ) THEN
        INSERT INTO public."RolePermission" (id, role, "permissionId", "createdAt")
        VALUES (gen_random_uuid()::text, admin_role_id, perm_id, CURRENT_TIMESTAMP);
      END IF;
    END LOOP;
  END IF;
END $$;
