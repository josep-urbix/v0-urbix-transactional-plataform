-- Corregir el nombre de tabla para el mapeo de status=6
-- Cambiar de "payments.payment_accounts" a "payment_accounts" para consistencia

UPDATE payments.lemonway_field_mappings
SET table_name = 'payment_accounts'
WHERE table_name = 'payments.payment_accounts'
  AND endpoint = 'accounts/retrieve'
  AND field_name = 'status'
  AND field_value = '6';

-- Verificar el cambio
SELECT * FROM payments.lemonway_field_mappings 
WHERE field_name = 'status' AND field_value = '6';
