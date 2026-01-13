-- Script de diagnóstico para verificar vinculación de wallets
-- Este script NO modifica datos, solo consulta

-- 1. Verificar cuántos payment_accounts existen con status = 6
SELECT 
    'Total wallets status=6' as info,
    COUNT(*) as cantidad
FROM payments.payment_accounts
WHERE status = '6';

-- 2. Verificar cuántos payment_accounts ya tienen cuenta_virtual_id
SELECT 
    'Wallets ya vinculados' as info,
    COUNT(*) as cantidad
FROM payments.payment_accounts
WHERE cuenta_virtual_id IS NOT NULL;

-- 3. Verificar cuentas virtuales existentes
SELECT 
    'Total cuentas virtuales' as info,
    COUNT(*) as cantidad
FROM virtual_accounts.cuentas_virtuales;

-- 4. Verificar si hay wallets status=6 sin vincular
SELECT 
    'Wallets status=6 SIN vincular' as info,
    COUNT(*) as cantidad
FROM payments.payment_accounts
WHERE status = '6' AND cuenta_virtual_id IS NULL;

-- 5. Ver detalle de algunos wallets status=6
SELECT 
    id,
    account_id,
    internal_id,
    email,
    status,
    cuenta_virtual_id,
    balance
FROM payments.payment_accounts
WHERE status = '6'
LIMIT 10;

-- 6. Ver registros en LemonwayTransaction relacionados con vinculación
SELECT 
    COUNT(*) as registros_vinculacion,
    MAX(created_at) as ultima_vinculacion
FROM public."LemonwayTransaction"
WHERE type = 'WALLET_LINKING'
   OR description LIKE '%Vinculación automática%';

-- 7. Verificar tareas creadas
SELECT 
    COUNT(*) as total_tareas
FROM tasks.tasks;

-- 8. Ver si hay algún status diferente a '6' en payment_accounts
SELECT 
    status,
    COUNT(*) as cantidad
FROM payments.payment_accounts
GROUP BY status
ORDER BY cantidad DESC;
