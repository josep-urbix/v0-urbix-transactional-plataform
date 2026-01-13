-- Create payments schema for Lemonway wallet management
CREATE SCHEMA IF NOT EXISTS payments;

-- Create payment_accounts table to store Lemonway wallet data
CREATE TABLE IF NOT EXISTS payments.payment_accounts (
  id SERIAL PRIMARY KEY,
  
  -- Lemonway account identifiers
  account_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  
  -- Account status and type
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, blocked, closed
  account_type VARCHAR(50), -- personal, business, etc.
  
  -- Balance information
  balance NUMERIC(15, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'EUR',
  blocked_balance NUMERIC(15, 2) DEFAULT 0.00,
  
  -- KYC information
  kyc_status VARCHAR(50), -- none, pending, validated, refused
  kyc_level INTEGER DEFAULT 0,
  
  -- User/owner information
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  company_name VARCHAR(255),
  
  -- Contact information
  phone_number VARCHAR(50),
  mobile_number VARCHAR(50),
  address TEXT,
  city VARCHAR(255),
  postal_code VARCHAR(20),
  country VARCHAR(2), -- ISO country code
  
  -- Account configuration
  is_debtor BOOLEAN DEFAULT false,
  is_payer BOOLEAN DEFAULT true,
  can_receive_money BOOLEAN DEFAULT true,
  can_send_money BOOLEAN DEFAULT true,
  
  -- Technical fields
  raw_data JSONB, -- Store complete Lemonway response for reference
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Indexes for common queries
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' OR email IS NULL)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_accounts_email ON payments.payment_accounts(email);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_status ON payments.payment_accounts(status);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_account_id ON payments.payment_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_last_sync ON payments.payment_accounts(last_sync_at);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION payments.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_accounts_updated_at
    BEFORE UPDATE ON payments.payment_accounts
    FOR EACH ROW
    EXECUTE FUNCTION payments.update_updated_at_column();

-- Grant permissions (adjust as needed for your user roles)
GRANT USAGE ON SCHEMA payments TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments.payment_accounts TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE payments.payment_accounts_id_seq TO PUBLIC;
