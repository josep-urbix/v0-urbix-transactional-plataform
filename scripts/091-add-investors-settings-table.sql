-- Add Settings table to investors schema
CREATE TABLE IF NOT EXISTS investors."Settings" (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_investors_settings_key ON investors."Settings" (key);

-- Insert default settings
INSERT INTO investors."Settings" (key, value) VALUES
  ('session_duration', '24'),
  ('max_sessions', '5'),
  ('require_email_verification', 'true'),
  ('require_2fa', 'false')
ON CONFLICT (key) DO NOTHING;
