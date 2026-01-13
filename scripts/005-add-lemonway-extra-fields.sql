-- Add missing Lemonway fields to payment_accounts table
ALTER TABLE payments.payment_accounts
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(3),
  ADD COLUMN IF NOT EXISTS client_title VARCHAR(10),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS birth_city VARCHAR(255),
  ADD COLUMN IF NOT EXISTS birth_country VARCHAR(3),
  ADD COLUMN IF NOT EXISTS internal_id INTEGER,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payer_or_beneficiary INTEGER,
  ADD COLUMN IF NOT EXISTS company_description TEXT,
  ADD COLUMN IF NOT EXISTS company_website VARCHAR(255),
  ADD COLUMN IF NOT EXISTS company_identification_number VARCHAR(100);

-- Update country column to support 3-letter codes if not already done
ALTER TABLE payments.payment_accounts 
  ALTER COLUMN country TYPE VARCHAR(3);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_payment_accounts_updated_at ON payments.payment_accounts(updated_at DESC);
