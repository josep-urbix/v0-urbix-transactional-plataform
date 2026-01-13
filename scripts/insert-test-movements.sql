-- Script para insertar movimientos de prueba en la cuenta virtual
-- Tabla: virtual_accounts.movimientos_cuenta

-- Primero, verificar que la cuenta existe
SELECT id, email, saldo_disponible FROM virtual_accounts.cuentas_virtuales 
WHERE id = '8bb2e263-6017-4af4-8e79-fb8c417a26e9';

-- Obtener el tipo de operación para CRÉDITO
SELECT id, nombre, codigo FROM virtual_accounts.tipos_operacion_contable 
WHERE activo = true LIMIT 1;

-- Insertar movimientos de prueba
INSERT INTO virtual_accounts.movimientos_cuenta (
  id,
  cuenta_id,
  tipo_operacion_id,
  fecha,
  importe,
  descripcion,
  origen,
  saldo_disponible_resultante,
  saldo_bloqueado_resultante,
  moneda,
  created_at
) VALUES
(
  gen_random_uuid(),
  '8bb2e263-6017-4af4-8e79-fb8c417a26e9',
  (SELECT id FROM virtual_accounts.tipos_operacion_contable WHERE activo = true LIMIT 1),
  NOW() - interval '5 days',
  1000.00,
  'Depósito inicial de prueba',
  'manual',
  19023.00,
  0.00,
  'EUR',
  NOW()
),
(
  gen_random_uuid(),
  '8bb2e263-6017-4af4-8e79-fb8c417a26e9',
  (SELECT id FROM virtual_accounts.tipos_operacion_contable WHERE activo = true LIMIT 1),
  NOW() - interval '2 days',
  500.00,
  'Transferencia de prueba',
  'manual',
  18523.00,
  0.00,
  'EUR',
  NOW()
),
(
  gen_random_uuid(),
  '8bb2e263-6017-4af4-8e79-fb8c417a26e9',
  (SELECT id FROM virtual_accounts.tipos_operacion_contable WHERE activo = true LIMIT 1),
  NOW() - interval '1 day',
  250.00,
  'Comisión de gestión',
  'manual',
  18273.00,
  0.00,
  'EUR',
  NOW()
);

-- Verificar que se insertaron
SELECT id, cuenta_id, importe, descripcion, fecha FROM virtual_accounts.movimientos_cuenta 
WHERE cuenta_id = '8bb2e263-6017-4af4-8e79-fb8c417a26e9'
ORDER BY fecha DESC;
