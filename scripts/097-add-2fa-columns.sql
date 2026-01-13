-- Add 2FA columns to investors.User table
ALTER TABLE investors."User"
ADD COLUMN IF NOT EXISTS two_factor_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_two_factor ON investors."User" (two_factor_enabled) WHERE two_factor_enabled = true;
