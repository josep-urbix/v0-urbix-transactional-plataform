UPDATE payments.lemonway_field_mappings
SET table_name = 'payments.payment_accounts'
WHERE table_name = 'payment_accounts'
  AND endpoint = 'accounts/retrieve';

-- Verificar los registros actualizados
SELECT id, endpoint, table_name, field_name, field_value, label, target_field, color
FROM payments.lemonway_field_mappings
ORDER BY id;
