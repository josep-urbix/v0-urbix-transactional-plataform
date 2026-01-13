-- =====================================================
-- Actualizar constraint de estado_importacion
-- =====================================================
-- Descripción: Agregar 'procesado' a los valores permitidos 
--              en el check constraint de estado_importacion
-- Autor: Sistema URBIX
-- Fecha: 2026-01-09
-- =====================================================

-- Eliminar constraint existente
ALTER TABLE lemonway_temp.movimientos_cuenta 
DROP CONSTRAINT IF EXISTS movimientos_cuenta_estado_importacion_check;

-- Agregar constraint actualizado con 'procesado'
ALTER TABLE lemonway_temp.movimientos_cuenta 
ADD CONSTRAINT movimientos_cuenta_estado_importacion_check 
CHECK (estado_importacion IN ('importado', 'duplicado', 'error', 'procesado'));

-- Verificación
SELECT 
    estado_importacion,
    COUNT(*) as total
FROM lemonway_temp.movimientos_cuenta
GROUP BY estado_importacion
ORDER BY estado_importacion;

SELECT 'Constraint actualizado exitosamente - ahora permite "procesado"' as status;
