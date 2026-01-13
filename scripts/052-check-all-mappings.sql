-- Corrected schema reference from public to payments
-- Verificar todos los mapeos existentes en la base de datos
SELECT 
  id,
  endpoint,
  table_name,
  field_name,
  field_value,
  label,
  target_field,
  color,
  created_at,
  updated_at
FROM payments.lemonway_field_mappings
ORDER BY id;
