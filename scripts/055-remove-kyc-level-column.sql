-- Eliminar la columna kyc_level de la tabla payment_accounts
ALTER TABLE payments.payment_accounts DROP COLUMN IF EXISTS kyc_level;

-- También eliminar de LemonwayWallet si existe
ALTER TABLE public."LemonwayWallet" DROP COLUMN IF EXISTS kyc_level;
