-- Limpieza de transacciones con lemonway_transaction_id vacío o NULL
-- Este script elimina las transacciones que no tienen un ID de transacción de Lemonway válido

-- Primero, mostrar el count de registros a eliminar
SELECT COUNT(*) as "Registros a eliminar" 
FROM virtual_accounts.movimientos_cuenta 
WHERE lemonway_transaction_id IS NULL 
   OR lemonway_transaction_id = ''
   OR lemonway_transaction_id = ' ';

-- Eliminar los registros
DELETE FROM virtual_accounts.movimientos_cuenta 
WHERE lemonway_transaction_id IS NULL 
   OR lemonway_transaction_id = ''
   OR lemonway_transaction_id = ' ';

-- Confirmar el resultado
SELECT COUNT(*) as "Registros restantes en movimientos_cuenta" 
FROM virtual_accounts.movimientos_cuenta;
