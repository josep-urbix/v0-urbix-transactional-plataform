-- Añadir columnas faltantes a investors."User"
ALTER TABLE investors."User" ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE investors."User" ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE investors."User" ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE investors."User" ADD COLUMN IF NOT EXISTS apple_id TEXT UNIQUE;
ALTER TABLE investors."User" ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'pending';
ALTER TABLE investors."User" ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE investors."User" ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE investors."User" ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
