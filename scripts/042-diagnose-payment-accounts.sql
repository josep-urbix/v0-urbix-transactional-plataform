-- Script de diagnóstico para verificar la tabla payment_accounts después de eliminar blocked_balance

-- 1. Verificar que la columna blocked_balance NO existe
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'payments' 
AND table_name = 'payment_accounts'
ORDER BY ordinal_position;

-- 2. Contar registros totales
SELECT COUNT(*) as total_accounts FROM payments.payment_accounts;

-- 3. Ver una muestra de datos
SELECT 
  account_id,
  email,
  status,
  balance,
  kyc_status,
  created_at
FROM payments.payment_accounts
LIMIT 5;

-- 4. Verificar si hay NULLs en campos críticos
SELECT 
  COUNT(*) FILTER (WHERE account_id IS NULL) as null_account_ids,
  COUNT(*) FILTER (WHERE status IS NULL) as null_status,
  COUNT(*) FILTER (WHERE balance IS NULL) as null_balance
FROM payments.payment_accounts;
