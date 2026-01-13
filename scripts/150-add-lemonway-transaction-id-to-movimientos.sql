-- Script 150: Agregar lemonway_transaction_id a tabla definitiva de movimientos
-- Descripción: Agrega el campo lemonway_transaction_id a virtual_accounts.movimientos_cuenta
--              y puebla los datos desde los movimientos que ya han sido procesados desde la tabla temporal

BEGIN;

-- 1. Agregar columna lemonway_transaction_id
-- UNIQUE: Cada transacción de Lemonway es única
-- NULLABLE: No todos los movimientos provienen de Lemonway
ALTER TABLE virtual_accounts.movimientos_cuenta
ADD COLUMN IF NOT EXISTS lemonway_transaction_id TEXT UNIQUE NULL;

-- 2. Crear índice para búsquedas rápidas en criterio de deduplicación
CREATE INDEX IF NOT EXISTS idx_movimientos_lemonway_transaction_id 
ON virtual_accounts.movimientos_cuenta(lemonway_transaction_id) 
WHERE lemonway_transaction_id IS NOT NULL;

-- 3. Poblar datos desde tabla temporal
-- Actualiza movimientos en tabla definitiva con lemonway_transaction_id desde tabla temporal
-- Usa DISTINCT ON para evitar duplicados si múltiples temporales apuntan al mismo definitivo
-- Usa ORDER BY created_at para obtener el movimiento temporal más antiguo en caso de duplicados
UPDATE virtual_accounts.movimientos_cuenta d
SET lemonway_transaction_id = t.lemonway_transaction_id
FROM (
  SELECT DISTINCT ON (t.movimientos_cuenta_id)
    t.movimientos_cuenta_id,
    t.lemonway_transaction_id
  FROM lemonway_temp.movimientos_cuenta t
  WHERE t.movimientos_cuenta_id IS NOT NULL
    AND t.lemonway_transaction_id IS NOT NULL
  ORDER BY t.movimientos_cuenta_id, t.created_at ASC
) t
WHERE d.id = t.movimientos_cuenta_id
  AND d.lemonway_transaction_id IS NULL;  -- Solo actualizar los que no tengan valor

-- 4. Auditoría: Mostrar estadísticas de población
SELECT 
  COUNT(*) as total_movimientos,
  COUNT(CASE WHEN lemonway_transaction_id IS NOT NULL THEN 1 END) as con_lemonway_transaction_id,
  COUNT(CASE WHEN lemonway_transaction_id IS NULL THEN 1 END) as sin_lemonway_transaction_id,
  COUNT(CASE WHEN lemonway_transaction_id IS NOT NULL AND origen = 'LEMONWAY' THEN 1 END) as lemonway_con_id,
  COUNT(CASE WHEN lemonway_transaction_id IS NULL AND origen = 'LEMONWAY' THEN 1 END) as lemonway_sin_id
FROM virtual_accounts.movimientos_cuenta
WHERE origen = 'LEMONWAY';

COMMIT;
