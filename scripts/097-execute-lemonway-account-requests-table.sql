-- EJECUCIÓN: Crear tabla investors.lemonway_account_requests
-- Esta tabla es CRÍTICA para el sistema de creación de cuentas Lemonway
-- Debe ejecutarse después de que investors.countries esté creada

BEGIN;

-- Verificar que la tabla investors.countries existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'investors' AND table_name = 'countries') THEN
    RAISE EXCEPTION 'La tabla investors.countries no existe. Ejecuta script 095 primero.';
  END IF;
END $$;

-- Crear tabla principal investors.lemonway_account_requests
CREATE TABLE IF NOT EXISTS investors.lemonway_account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_reference VARCHAR(20) UNIQUE NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'DRAFT',
  validation_status VARCHAR DEFAULT 'PENDING',
  validation_errors JSONB,
  
  -- Datos personales (Fase 1)
  first_name VARCHAR(35) NOT NULL,
  last_name VARCHAR(35) NOT NULL,
  birth_date DATE NOT NULL,
  email VARCHAR(60) NOT NULL,
  phone_number VARCHAR(20),
  birth_country_id UUID NOT NULL,
  nationality_ids UUID[] NOT NULL,
  profile_type VARCHAR NOT NULL,
  
  -- Datos de dirección (Fase 1)
  street VARCHAR(256),
  city VARCHAR(90),
  postal_code VARCHAR(90),
  country_id UUID,
  province VARCHAR,
  
  -- Datos KYC/AML (Fase 2)
  occupation VARCHAR,
  annual_income VARCHAR,
  estimated_wealth VARCHAR,
  pep_status VARCHAR,
  pep_position VARCHAR,
  pep_start_date DATE,
  pep_end_date DATE,
  origin_of_funds JSONB,
  has_ifi_tax BOOLEAN,
  
  -- Linking con otros sistemas
  payment_account_id UUID,
  lemonway_wallet_id VARCHAR,
  virtual_account_id UUID,
  
  -- Error tracking
  lemonway_error_message VARCHAR,
  last_error_at TIMESTAMP,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  -- URLs y resumption
  lemonway_resumption_url VARCHAR,
  
  -- Auditoría
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  kyc_1_completed_at TIMESTAMP,
  kyc_2_completed_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason VARCHAR,
  
  -- Soft delete
  deleted_at TIMESTAMP,
  is_archived BOOLEAN DEFAULT false,
  
  FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  FOREIGN KEY (birth_country_id) REFERENCES investors.countries(id) ON DELETE RESTRICT,
  FOREIGN KEY (country_id) REFERENCES investors.countries(id) ON DELETE SET NULL
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_lemonway_requests_reference ON investors.lemonway_account_requests(request_reference);
CREATE INDEX IF NOT EXISTS idx_lemonway_requests_status ON investors.lemonway_account_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lemonway_requests_wallet_id ON investors.lemonway_account_requests(lemonway_wallet_id);
CREATE INDEX IF NOT EXISTS idx_lemonway_requests_payment_account_id ON investors.lemonway_account_requests(payment_account_id);
CREATE INDEX IF NOT EXISTS idx_lemonway_requests_created_by ON investors.lemonway_account_requests(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_lemonway_requests_email ON investors.lemonway_account_requests(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lemonway_requests_created_at ON investors.lemonway_account_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lemonway_requests_validation_status ON investors.lemonway_account_requests(validation_status) WHERE deleted_at IS NULL;

-- Crear vistas
DROP VIEW IF EXISTS investors.v_lemonway_requests_active CASCADE;
CREATE VIEW investors.v_lemonway_requests_active AS
SELECT *
FROM investors.lemonway_account_requests
WHERE deleted_at IS NULL AND status NOT IN ('CANCELLED', 'REJECTED')
ORDER BY updated_at DESC;

DROP VIEW IF EXISTS investors.v_lemonway_requests_by_status CASCADE;
CREATE VIEW investors.v_lemonway_requests_by_status AS
SELECT 
  status,
  COUNT(*) as total,
  COUNT(CASE WHEN validation_status = 'INVALID' THEN 1 END) as invalid_count,
  COUNT(CASE WHEN retry_count > 0 THEN 1 END) as retried_count
FROM investors.lemonway_account_requests
WHERE deleted_at IS NULL
GROUP BY status;

COMMIT;
