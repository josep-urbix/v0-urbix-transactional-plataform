-- Migration: Convert Lemonway authentication from login/password to token-only
-- This script updates the LemonwayConfig table structure

-- Drop existing columns if they exist
ALTER TABLE "LemonwayConfig" 
DROP COLUMN IF EXISTS "login",
DROP COLUMN IF EXISTS "password";

-- Add new api_token column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='LemonwayConfig' AND column_name='api_token'
    ) THEN
        ALTER TABLE "LemonwayConfig" ADD COLUMN "api_token" TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Update the constraint to ensure api_token is not empty
ALTER TABLE "LemonwayConfig" 
DROP CONSTRAINT IF EXISTS "LemonwayConfig_api_token_check",
ADD CONSTRAINT "LemonwayConfig_api_token_check" CHECK (length("api_token") > 0);
