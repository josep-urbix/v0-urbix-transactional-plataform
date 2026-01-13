-- Script ONE-TIME: Vinculación masiva de wallets status=6 con cuentas virtuales
-- Este script debe ejecutarse UNA SOLA VEZ para establecer las vinculaciones iniciales

-- Corregido para usar solo las columnas que existen en virtual_accounts.cuentas_virtuales

-- Paso 1: Crear cuentas virtuales para wallets status=6 que no tienen cuenta virtual
INSERT INTO virtual_accounts.cuentas_virtuales (
  id,
  tipo,
  referencia_externa_tipo,
  referencia_externa_id,
  lemonway_account_id,
  lemonway_internal_id,
  email,
  moneda,
  saldo_disponible,
  saldo_bloqueado,
  estado,
  vinculacion_timestamp,
  vinculacion_bloqueada,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'INVERSOR'::virtual_accounts.tipo_cuenta,
  'lemonway_wallet',
  pa.account_id,
  pa.account_id,
  pa.internal_id,
  pa.email,
  COALESCE(pa.currency, 'EUR'),
  COALESCE(pa.balance, 0),
  0,
  'ACTIVA'::virtual_accounts.estado_cuenta,
  NOW(),
  false,
  NOW(),
  NOW()
FROM payments.payment_accounts pa
WHERE pa.status = '6'
  AND NOT EXISTS (
    SELECT 1 
    FROM virtual_accounts.cuentas_virtuales cv 
    WHERE cv.referencia_externa_tipo = 'lemonway_wallet' 
      AND cv.referencia_externa_id = pa.account_id
  );

-- Paso 2: Actualizar cuentas virtuales existentes con datos de vinculación
UPDATE virtual_accounts.cuentas_virtuales cv
SET 
  lemonway_account_id = pa.account_id,
  lemonway_internal_id = pa.internal_id,
  email = pa.email,
  vinculacion_timestamp = COALESCE(cv.vinculacion_timestamp, NOW()),
  updated_at = NOW()
FROM payments.payment_accounts pa
WHERE cv.referencia_externa_tipo = 'lemonway_wallet'
  AND cv.referencia_externa_id = pa.account_id
  AND pa.status = '6'
  AND (
    cv.lemonway_account_id IS NULL 
    OR cv.lemonway_internal_id IS NULL 
    OR cv.email IS NULL
  );

-- Paso 3: Vincular payment_accounts con cuentas_virtuales (bidireccional)
UPDATE payments.payment_accounts pa
SET cuenta_virtual_id = cv.id
FROM virtual_accounts.cuentas_virtuales cv
WHERE cv.referencia_externa_tipo = 'lemonway_wallet'
  AND cv.referencia_externa_id = pa.account_id
  AND pa.status = '6'
  AND pa.cuenta_virtual_id IS NULL;

-- Paso 4: Registrar la operación en LemonwayTransaction
INSERT INTO public."LemonwayTransaction" (
  transaction_id,
  wallet_id,
  type,
  direction,
  amount,
  status,
  metadata,
  created_at,
  updated_at
)
SELECT 
  'WALLET_LINK_' || pa.account_id || '_' || EXTRACT(EPOCH FROM NOW())::TEXT,
  pa.account_id,
  'WALLET_LINKING_ONE_TIME',
  'INTERNAL',
  0,
  'COMPLETED',
  jsonb_build_object(
    'script', '106-wallet-linking-one-time.sql',
    'wallet_status', pa.status,
    'cuenta_virtual_id', cv.id::text,
    'vinculacion_timestamp', cv.vinculacion_timestamp,
    'automatico', true
  ),
  NOW(),
  NOW()
FROM payments.payment_accounts pa
INNER JOIN virtual_accounts.cuentas_virtuales cv 
  ON cv.referencia_externa_tipo = 'lemonway_wallet' 
  AND cv.referencia_externa_id = pa.account_id
WHERE pa.status = '6'
  AND pa.cuenta_virtual_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public."LemonwayTransaction" lt
    WHERE lt.transaction_id LIKE 'WALLET_LINK_' || pa.account_id || '%'
  );

-- Reporte final: Resumen de vinculaciones
SELECT 
  'RESUMEN DE VINCULACIONES' AS reporte,
  COUNT(*) AS total_vinculados,
  COUNT(CASE WHEN cv.vinculacion_timestamp >= NOW() - INTERVAL '1 hour' THEN 1 END) AS nuevas_vinculaciones,
  COUNT(CASE WHEN cv.vinculacion_bloqueada = true THEN 1 END) AS vinculaciones_bloqueadas
FROM virtual_accounts.cuentas_virtuales cv
WHERE cv.lemonway_account_id IS NOT NULL;

-- Verificar wallets status=6 sin cuenta virtual (posibles problemas)
SELECT 
  'WALLETS SIN VINCULAR' AS alerta,
  pa.account_id,
  pa.internal_id,
  pa.email,
  pa.status
FROM payments.payment_accounts pa
WHERE pa.status = '6'
  AND pa.cuenta_virtual_id IS NULL;
