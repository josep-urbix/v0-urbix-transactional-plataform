-- Agregar campos para mapeo de tipos de transacción Lemonway
ALTER TABLE virtual_accounts.tipos_operacion_contable
ADD COLUMN lemonway_transaction_type TEXT,
ADD COLUMN lemonway_direction VARCHAR(20),
ADD COLUMN lemonway_payment_method TEXT;

-- Agregar comentarios a los campos (forma correcta en PostgreSQL)
COMMENT ON COLUMN virtual_accounts.tipos_operacion_contable.lemonway_transaction_type IS 'Tipos Lemonway: 0=Card, 1=MoneyIn, 3=MoneyOut, 4=P2P, 13=iDEAL, 14=SEPA, 15=Cheque, 19=Multibanco, 35=PayPal';
COMMENT ON COLUMN virtual_accounts.tipos_operacion_contable.lemonway_direction IS 'NULL (any direction), money_in, money_out';
COMMENT ON COLUMN virtual_accounts.tipos_operacion_contable.lemonway_payment_method IS 'Métodos de pago aplicables (separados por coma)';

-- Actualizar tipos de operación existentes con mapeo Lemonway

-- INGRESO_EXTERNO: Recibe dinero desde Lemonway (MoneyIn, iDEAL, SEPA, Multibanco, PayPal)
UPDATE virtual_accounts.tipos_operacion_contable
SET 
  lemonway_transaction_type = '1,13,14,19,35',
  lemonway_direction = 'money_in',
  lemonway_payment_method = 'BANK_TRANSFER,IDEAL,SEPA,MULTIBANCO,PAYPAL'
WHERE codigo = 'INGRESO_EXTERNO';

-- RETIRADA_EXTERNA: Retira dinero a Lemonway (MoneyOut)
UPDATE virtual_accounts.tipos_operacion_contable
SET 
  lemonway_transaction_type = '3',
  lemonway_direction = 'money_out',
  lemonway_payment_method = 'BANK_TRANSFER'
WHERE codigo = 'RETIRADA_EXTERNA';

-- TRANSFERENCIA_P2P: Transferencia P2P
UPDATE virtual_accounts.tipos_operacion_contable
SET 
  lemonway_transaction_type = '4',
  lemonway_direction = NULL,
  lemonway_payment_method = 'P2P'
WHERE codigo = 'TRANSFERENCIA_P2P';

-- OPERACION_CON_TARJETA: Operación con tarjeta
UPDATE virtual_accounts.tipos_operacion_contable
SET 
  lemonway_transaction_type = '0',
  lemonway_direction = NULL,
  lemonway_payment_method = 'CARD'
WHERE codigo = 'OPERACION_CON_TARJETA';
