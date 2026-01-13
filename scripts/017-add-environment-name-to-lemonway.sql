-- Add environment_name column to LemonwayConfig for DirectKit REST v2 URL
ALTER TABLE "LemonwayConfig" 
ADD COLUMN IF NOT EXISTS environment_name TEXT DEFAULT 'urbix';

-- Update existing config with environment name
UPDATE "LemonwayConfig" 
SET environment_name = 'urbix' 
WHERE environment_name IS NULL;

-- Remove obsolete columns if they exist
ALTER TABLE "LemonwayConfig" 
DROP COLUMN IF EXISTS api_url;

ALTER TABLE "LemonwayConfig" 
DROP COLUMN IF EXISTS api_base_url;
