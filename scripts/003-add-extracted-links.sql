-- Add columns for extracted meeting links
ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "googleMeetLink" TEXT,
ADD COLUMN IF NOT EXISTS "rescheduleLink" TEXT,
ADD COLUMN IF NOT EXISTS "cancelLink" TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_transaction_google_meet" ON "Transaction"("googleMeetLink") WHERE "googleMeetLink" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_transaction_reschedule" ON "Transaction"("rescheduleLink") WHERE "rescheduleLink" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_transaction_cancel" ON "Transaction"("cancelLink") WHERE "cancelLink" IS NOT NULL;
