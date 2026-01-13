-- Add contact email column to Transaction table
ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "Transaction_contactEmail_idx" ON "Transaction"("contactEmail");
