-- Add google_id column to admin User table for Google OAuth
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" text;

-- Add index for google_id lookups
CREATE INDEX IF NOT EXISTS idx_user_google_id ON "User"("googleId");

-- Add avatar column
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "avatarUrl" text;
