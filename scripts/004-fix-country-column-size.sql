-- Fix country column to accept ISO 3166-1 alpha-3 codes (3 characters)
-- Lemonway returns country codes like "ESP", "FRA", "USA" instead of "ES", "FR", "US"

ALTER TABLE payments.payment_accounts 
ALTER COLUMN country TYPE VARCHAR(3);

-- Update the comment to reflect the change
COMMENT ON COLUMN payments.payment_accounts.country IS 'ISO 3166-1 alpha-3 country code (3 letters)';
