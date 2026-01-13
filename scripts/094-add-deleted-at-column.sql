-- Añadir columna deleted_at a investors."User" si no existe
ALTER TABLE investors."User" 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Crear índice para soft delete
CREATE INDEX IF NOT EXISTS idx_user_deleted_at ON investors."User"(deleted_at);
