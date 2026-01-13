-- Fix table name for mapping ID 8 to remove schema prefix
UPDATE payments.lemonway_field_mappings
SET table_name = 'payment_accounts'
WHERE id = 8 AND table_name = 'payments.payment_accounts';

-- Verify the fix
SELECT id, endpoint, table_name, field_name, field_value, label, target_field, color
FROM payments.lemonway_field_mappings
WHERE id = 8;
