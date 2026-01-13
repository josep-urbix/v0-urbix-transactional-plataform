-- Script para poblar senderAccountId, receiverAccountId y relacionado_con_movimiento_id
-- en las tablas de movimientos (temporal y definitiva)

-- PASO 1: Tabla TEMPORAL - Poblar senderAccountId y receiverAccountId desde descripcion
UPDATE lemonway_temp.movimientos_cuenta
SET 
    senderaccountid = (
        SELECT regexp_replace(descripcion, '.*\[(\d+)\s*=>', '\1', 'g')
        WHERE descripcion ~ '\[\d+\s*=>'
    ),
    receiveraccountid = (
        SELECT regexp_replace(descripcion, '.*=>\s*(\d+)\].*', '\1', 'g')
        WHERE descripcion ~ '=>\s*\d+\]'
    )
WHERE tipo_transaccion = 'P2P' 
  AND descripcion IS NOT NULL
  AND senderaccountid IS NULL;

-- PASO 2: Tabla DEFINITIVA - Poblar senderAccountId y receiverAccountId desde descripcion
UPDATE virtual_accounts.movimientos_cuenta
SET 
    senderaccountid = (
        SELECT regexp_replace(descripcion, '.*\[(\d+)\s*=>', '\1', 'g')
        WHERE descripcion ~ '\[\d+\s*=>'
    ),
    receiveraccountid = (
        SELECT regexp_replace(descripcion, '.*=>\s*(\d+)\].*', '\1', 'g')
        WHERE descripcion ~ '=>\s*\d+\]'
    )
WHERE descripcion ILIKE '%P2P%'
  AND descripcion IS NOT NULL
  AND senderaccountid IS NULL;

-- PASO 3: Crear relaciones P2P en tabla DEFINITIVA
-- Identificar pares de movimientos que son espejo (entrada/salida) del mismo P2P
UPDATE virtual_accounts.movimientos_cuenta mc1
SET relacionado_con_movimiento_id = mc2.id
FROM virtual_accounts.movimientos_cuenta mc2
WHERE mc1.lemonway_transaction_id = mc2.lemonway_transaction_id
  AND mc1.id != mc2.id
  AND mc1.senderaccountid != mc2.senderaccountid
  AND (mc1.importe > 0 AND mc2.importe < 0)
  AND mc1.relacionado_con_movimiento_id IS NULL;

-- PASO 4: Crear relaciones P2P en tabla TEMPORAL
UPDATE lemonway_temp.movimientos_cuenta mt1
SET relacionado_con_movimiento_id = mt2.id
FROM lemonway_temp.movimientos_cuenta mt2
WHERE mt1.lemonway_transaction_id = mt2.lemonway_transaction_id
  AND mt1.id != mt2.id
  AND mt1.senderaccountid != mt2.senderaccountid
  AND (mt1.monto > 0 AND mt2.monto < 0)
  AND mt1.relacionado_con_movimiento_id IS NULL;

-- PASO 5: Verificación - contar movimientos P2P poblados
SELECT 'Tabla TEMPORAL' as tabla, 
       COUNT(*) as total_p2p,
       COUNT(CASE WHEN senderaccountid IS NOT NULL THEN 1 END) as con_sender,
       COUNT(CASE WHEN receiveraccountid IS NOT NULL THEN 1 END) as con_receiver,
       COUNT(CASE WHEN relacionado_con_movimiento_id IS NOT NULL THEN 1 END) as con_relacion
FROM lemonway_temp.movimientos_cuenta
WHERE tipo_transaccion = 'P2P'

UNION ALL

SELECT 'Tabla DEFINITIVA' as tabla,
       COUNT(*) as total_p2p,
       COUNT(CASE WHEN senderaccountid IS NOT NULL THEN 1 END) as con_sender,
       COUNT(CASE WHEN receiveraccountid IS NOT NULL THEN 1 END) as con_receiver,
       COUNT(CASE WHEN relacionado_con_movimiento_id IS NOT NULL THEN 1 END) as con_relacion
FROM virtual_accounts.movimientos_cuenta
WHERE descripcion ILIKE '%P2P%';
