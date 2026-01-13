-- Agregar columna click_count a email_sends si no existe
ALTER TABLE emails.email_sends 
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- Agregar columna open_count si no existe  
ALTER TABLE emails.email_sends 
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0;

-- Verificar estructura
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_schema = 'emails' AND table_name = 'email_sends'
ORDER BY ordinal_position;
