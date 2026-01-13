-- Agregar columna de estado de revisión
ALTER TABLE lemonway_temp.movimientos_cuenta 
ADD COLUMN IF NOT EXISTS estado_revision TEXT DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS revisado_por TEXT,
ADD COLUMN IF NOT EXISTS revisado_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_movimientos_estado_revision 
ON lemonway_temp.movimientos_cuenta(estado_revision);
