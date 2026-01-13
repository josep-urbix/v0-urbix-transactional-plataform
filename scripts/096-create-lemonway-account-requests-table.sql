-- Script: Crear tabla investors.lemonway_account_requests
-- Propósito: Almacenar solicitudes de creación de cuentas Lemonway con estados KYC-1 y KYC-2
-- Fecha: 2025-01-13
-- Trazabilidad: Especificación LEMONWAY-CREACION-CUENTAS-ESPECIFICACION.md - Sección 8.1

BEGIN;

-- Crear tabla principal investors.lemonway_account_requests
CREATE TABLE IF NOT EXISTS investors.lemonway_account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_reference VARCHAR(20) UNIQUE NOT NULL, -- REQ-2025-001, REQ-2025-002, etc
  status VARCHAR NOT NULL DEFAULT 'DRAFT',
    -- Estados: DRAFT, SUBMITTED, KYC-1 Completo, KYC-2 Completo, ACTIVE, INVALID, REJECTED, CANCELLED
  validation_status VARCHAR DEFAULT 'PENDING',
    -- PENDING, VALID, INVALID - Pre-validación de formato
  validation_errors JSONB, -- Errores de validación por campo {first_name: "error", email: "error"}
  
  -- Datos personales (Fase 1)
  first_name VARCHAR(35) NOT NULL,
  last_name VARCHAR(35) NOT NULL,
  birth_date DATE NOT NULL,
  email VARCHAR(60) NOT NULL,
  phone_number VARCHAR(20),
  birth_country_id UUID NOT NULL, -- FK a investors.countries
  nationality_ids UUID[] NOT NULL, -- Array de FK a investors.countries
  profile_type VARCHAR NOT NULL, -- PROJECT_HOLDER, DONOR, STUDENT, JOB_SEEKER, PAYER
  
  -- Datos de dirección (Fase 1)
  street VARCHAR(256),
  city VARCHAR(90),
  postal_code VARCHAR(90),
  country_id UUID, -- FK a investors.countries (residencia)
  province VARCHAR,
  
  -- Datos KYC/AML (Fase 2)
  occupation VARCHAR, -- Código PCS2020
  annual_income VARCHAR, -- Rango: 0-10K, 10K-25K, etc
  estimated_wealth VARCHAR, -- Rango: 0-50K, 50K-100K, etc
  pep_status VARCHAR, -- 'no', 'yes', 'close_to_pep'
  pep_position VARCHAR, -- POLITICAL_LEADER, etc (si pep_status = yes)
  pep_start_date DATE,
  pep_end_date DATE,
  origin_of_funds JSONB, -- Array: [INCOME, INVESTMENTS, INHERITANCE, ...]
  has_ifi_tax BOOLEAN,
  
  -- Linking con otros sistemas
  payment_account_id UUID, -- FK a payments.payment_accounts (cuando se crea)
  lemonway_wallet_id VARCHAR, -- Wallet ID devuelto por Lemonway
  virtual_account_id UUID, -- FK a virtual_accounts.cuentas_virtuales (cuando se crea)
  
  -- Error tracking
  lemonway_error_message VARCHAR,
  last_error_at TIMESTAMP,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  -- URLs y resumption
  lemonway_resumption_url VARCHAR,
  
  -- Auditoría
  created_by_user_id UUID NOT NULL, -- FK a auth.users
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  kyc_1_completed_at TIMESTAMP, -- Cuando completó FASE 1 (creación de cuenta)
  kyc_2_completed_at TIMESTAMP, -- Cuando completó FASE 2 (verificación identidad)
  rejected_at TIMESTAMP,
  rejection_reason VARCHAR,
  
  -- Soft delete
  deleted_at TIMESTAMP,
  is_archived BOOLEAN DEFAULT false,
  
  FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  FOREIGN KEY (birth_country_id) REFERENCES investors.countries(id) ON DELETE RESTRICT,
  FOREIGN KEY (country_id) REFERENCES investors.countries(id) ON DELETE SET NULL
);

-- Crear índices para búsquedas rápidas
CREATE INDEX idx_lemonway_requests_reference ON investors.lemonway_account_requests(request_reference);
CREATE INDEX idx_lemonway_requests_status ON investors.lemonway_account_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_lemonway_requests_wallet_id ON investors.lemonway_account_requests(lemonway_wallet_id);
CREATE INDEX idx_lemonway_requests_payment_account_id ON investors.lemonway_account_requests(payment_account_id);
CREATE INDEX idx_lemonway_requests_created_by ON investors.lemonway_account_requests(created_by_user_id);
CREATE INDEX idx_lemonway_requests_email ON investors.lemonway_account_requests(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_lemonway_requests_created_at ON investors.lemonway_account_requests(created_at DESC);
CREATE INDEX idx_lemonway_requests_validation_status ON investors.lemonway_account_requests(validation_status) WHERE deleted_at IS NULL;

-- Crear vista para solicitudes activas (no eliminadas, no canceladas)
CREATE OR REPLACE VIEW investors.v_lemonway_requests_active AS
SELECT *
FROM investors.lemonway_account_requests
WHERE deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')
ORDER BY updated_at DESC;

-- Crear vista para solicitudes por estado
CREATE OR REPLACE VIEW investors.v_lemonway_requests_by_status AS
SELECT 
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN validation_status = 'INVALID' THEN 1 END) as invalid_count,
  COUNT(CASE WHEN retry_count > 0 THEN 1 END) as retried_count
FROM investors.lemonway_account_requests
WHERE deleted_at IS NULL
GROUP BY status;

COMMIT;
