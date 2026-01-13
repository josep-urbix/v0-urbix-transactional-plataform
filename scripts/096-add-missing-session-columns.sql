-- Añadir columnas faltantes a la tabla investors."Session"

-- Añadir token_hash
ALTER TABLE investors."Session" 
ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255);

-- Añadir refresh_token_hash
ALTER TABLE investors."Session" 
ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255);

-- Añadir device_info
ALTER TABLE investors."Session" 
ADD COLUMN IF NOT EXISTS device_info JSONB;

-- Añadir ip_address
ALTER TABLE investors."Session" 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);

-- Añadir user_agent
ALTER TABLE investors."Session" 
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Añadir last_activity
ALTER TABLE investors."Session" 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Añadir is_active
ALTER TABLE investors."Session" 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Crear índice para token_hash si no existe
CREATE INDEX IF NOT EXISTS idx_session_token_hash ON investors."Session"(token_hash);

-- Crear índice para user_id si no existe
CREATE INDEX IF NOT EXISTS idx_session_user_id ON investors."Session"(user_id);
