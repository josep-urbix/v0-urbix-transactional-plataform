-- Add all missing retry columns to LemonwayApiCallLog
-- This ensures the retry queue system works correctly
-- Using DO blocks for better error handling

-- Add processing_lock_at column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'LemonwayApiCallLog' 
    AND column_name = 'processing_lock_at'
  ) THEN
    ALTER TABLE "LemonwayApiCallLog" ADD COLUMN processing_lock_at TIMESTAMP;
  END IF;
END $$;

-- Add final_failure column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'LemonwayApiCallLog' 
    AND column_name = 'final_failure'
  ) THEN
    ALTER TABLE "LemonwayApiCallLog" ADD COLUMN final_failure BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add manual_retry_needed column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'LemonwayApiCallLog' 
    AND column_name = 'manual_retry_needed'
  ) THEN
    ALTER TABLE "LemonwayApiCallLog" ADD COLUMN manual_retry_needed BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add error_message column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'LemonwayApiCallLog' 
    AND column_name = 'error_message'
  ) THEN
    ALTER TABLE "LemonwayApiCallLog" ADD COLUMN error_message TEXT;
  END IF;
END $$;

-- Add response_status column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'LemonwayApiCallLog' 
    AND column_name = 'response_status'
  ) THEN
    ALTER TABLE "LemonwayApiCallLog" ADD COLUMN response_status INTEGER;
  END IF;
END $$;

-- Add response_text column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'LemonwayApiCallLog' 
    AND column_name = 'response_text'
  ) THEN
    ALTER TABLE "LemonwayApiCallLog" ADD COLUMN response_text TEXT;
  END IF;
END $$;

-- Create index for retry queue queries
CREATE INDEX IF NOT EXISTS idx_lemonway_api_call_log_retry_queue 
ON "LemonwayApiCallLog" (retry_status, next_retry_at, retry_count, processing_lock_at)
WHERE retry_status IN ('pending', 'limit_pending');

-- Create index for processing lock cleanup
CREATE INDEX IF NOT EXISTS idx_lemonway_api_call_log_processing_lock
ON "LemonwayApiCallLog" (processing_lock_at)
WHERE processing_lock_at IS NOT NULL;
