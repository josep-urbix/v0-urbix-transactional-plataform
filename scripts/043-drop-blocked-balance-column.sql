-- Eliminar la columna blocked_balance que no viene en la API de Lemonway

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'payments' 
    AND table_name = 'payment_accounts' 
    AND column_name = 'blocked_balance'
  ) THEN
    ALTER TABLE payments.payment_accounts DROP COLUMN blocked_balance;
    RAISE NOTICE 'Column blocked_balance dropped successfully';
  ELSE
    RAISE NOTICE 'Column blocked_balance does not exist, skipping';
  END IF;
END $$;
