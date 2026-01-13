-- Diagnóstico completo para entender por qué no aparecen wallets en la API

-- 1. Verificar cuántos payment_accounts existen en total
SELECT 'Total payment_accounts' as info, COUNT(*)::text as cantidad
FROM payments.payment_accounts;

-- 2. Verificar cuántos tienen cuenta_virtual_id no nulo
SELECT 'Payment accounts con cuenta_virtual_id' as info, COUNT(*)::text as cantidad
FROM payments.payment_accounts
WHERE cuenta_virtual_id IS NOT NULL;

-- 3. Verificar cuántos tienen status = 6
SELECT 'Payment accounts con status 6' as info, COUNT(*)::text as cantidad
FROM payments.payment_accounts
WHERE status = '6';

-- 4. Ver datos de los primeros 5 payment_accounts vinculados
SELECT 
  'Primeros 5 vinculados' as info,
  pa.id,
  pa.account_id,
  pa.internal_id,
  pa.email,
  pa.status,
  pa.cuenta_virtual_id
FROM payments.payment_accounts pa
WHERE pa.cuenta_virtual_id IS NOT NULL
LIMIT 5;

-- 5. Verificar si el JOIN funciona
SELECT 
  'JOIN payment_accounts y cuentas_virtuales' as info,
  COUNT(*)::text as cantidad
FROM payments.payment_accounts pa
LEFT JOIN virtual_accounts.cuentas_virtuales cv ON pa.cuenta_virtual_id = cv.id
WHERE pa.cuenta_virtual_id IS NOT NULL;

-- 6. Ver datos completos del JOIN
SELECT 
  pa.id,
  pa.account_id,
  pa.cuenta_virtual_id,
  cv.id as cv_id,
  cv.lemonway_account_id,
  cv.vinculacion_timestamp
FROM payments.payment_accounts pa
LEFT JOIN virtual_accounts.cuentas_virtuales cv ON pa.cuenta_virtual_id = cv.id
WHERE pa.cuenta_virtual_id IS NOT NULL
LIMIT 5;
