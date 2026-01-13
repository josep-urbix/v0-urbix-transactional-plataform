-- Cambiar a UPDATE si existe, INSERT si no existe para evitar duplicate key error
-- Actualizar mapeo existente o crear uno nuevo: cuando status=6, mostrar "Activo" en verde en kycStatus

-- Primero intentar actualizar
UPDATE payments.lemonway_field_mappings
SET 
  label = 'Activo',
  target_field = 'kycStatus',
  color = 'green',
  updated_at = NOW()
WHERE 
  endpoint = 'accounts/retrieve'
  AND table_name = 'payment_accounts'
  AND field_name = 'status'
  AND field_value = '6';

-- Si no existía, insertar
INSERT INTO payments.lemonway_field_mappings (
  endpoint,
  table_name,
  field_name,
  field_value,
  label,
  target_field,
  color,
  created_at,
  updated_at
)
SELECT 
  'accounts/retrieve',
  'payment_accounts',
  'status',
  '6',
  'Activo',
  'kycStatus',
  'green',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM payments.lemonway_field_mappings
  WHERE endpoint = 'accounts/retrieve'
    AND table_name = 'payment_accounts'
    AND field_name = 'status'
    AND field_value = '6'
);
