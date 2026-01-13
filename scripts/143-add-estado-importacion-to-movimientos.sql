-- =====================================================
-- Añadir campo estado_importacion a movimientos_cuenta
-- =====================================================
-- Descripción: Añade campo para rastrear el estado de importación
--              de cada transacción (importado, duplicado, error)
-- Autor: Sistema URBIX
-- Fecha: 2026-01-09
-- =====================================================

-- Añadir columna estado_importacion
ALTER TABLE lemonway_temp.movimientos_cuenta 
ADD COLUMN IF NOT EXISTS estado_importacion TEXT 
CHECK (estado_importacion IN ('importado', 'duplicado', 'error'))
DEFAULT 'importado';

-- Crear índice para consultas por estado
CREATE INDEX IF NOT EXISTS idx_movimientos_estado_importacion 
ON lemonway_temp.movimientos_cuenta(estado_importacion);

-- Actualizar registros existentes
UPDATE lemonway_temp.movimientos_cuenta
SET estado_importacion = 'importado'
WHERE estado_importacion IS NULL;

-- Verificación
SELECT 
    estado_importacion,
    COUNT(*) as total
FROM lemonway_temp.movimientos_cuenta
GROUP BY estado_importacion
ORDER BY estado_importacion;

SELECT 'Campo estado_importacion añadido exitosamente' as status;
