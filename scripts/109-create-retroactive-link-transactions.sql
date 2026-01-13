-- Script para crear registros retroactivos en LemonwayTransaction
-- para todas las vinculaciones que ya existen pero no están registradas

DO $$
DECLARE
    v_wallet RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Recorrer todos los wallets vinculados que NO tienen registro en LemonwayTransaction
    FOR v_wallet IN 
        SELECT 
            pa.id as payment_account_id,
            pa.account_id,
            pa.internal_id,
            pa.email,
            pa.cuenta_virtual_id,
            cv.lemonway_account_id,
            cv.lemonway_internal_id,
            cv.email as cv_email,
            cv.vinculacion_timestamp,
            cv.created_at
        FROM payments.payment_accounts pa
        INNER JOIN virtual_accounts.cuentas_virtuales cv ON pa.cuenta_virtual_id = cv.id
        WHERE pa.status = '6' 
          AND pa.cuenta_virtual_id IS NOT NULL
          AND cv.lemonway_account_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 
              FROM public."LemonwayTransaction" lt
              WHERE lt.wallet_id = pa.account_id
                AND lt.type = 'SYSTEM'
                AND lt.metadata->>'action' IN ('wallet_link', 'update_wallet_link')
                AND lt.metadata->>'cuenta_virtual_id' = cv.id::text
          )
    LOOP
        -- Crear registro retroactivo en LemonwayTransaction
        INSERT INTO public."LemonwayTransaction" (
            transaction_id,
            wallet_id,
            amount,
            currency,
            status,
            type,
            direction,
            description,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            'RETRO_LINK_' || v_wallet.cuenta_virtual_id || '_' || EXTRACT(EPOCH FROM NOW())::TEXT,
            v_wallet.account_id,
            0,
            'EUR',
            'COMPLETED',
            'SYSTEM',
            'INTERNAL',
            'Registro retroactivo de vinculación wallet-cuenta virtual',
            jsonb_build_object(
                'action', 'update_wallet_link',
                'retroactive', true,
                'payment_account_id', v_wallet.payment_account_id,
                'cuenta_virtual_id', v_wallet.cuenta_virtual_id,
                'account_id', v_wallet.account_id,
                'internal_id', v_wallet.internal_id,
                'email', v_wallet.email,
                'vinculacion_timestamp', COALESCE(v_wallet.vinculacion_timestamp, v_wallet.created_at),
                'registro_creado_en', NOW()
            ),
            COALESCE(v_wallet.vinculacion_timestamp, v_wallet.created_at, NOW()),
            NOW()
        );
        
        v_count := v_count + 1;
        
        RAISE NOTICE 'Registro retroactivo creado para wallet % - cuenta virtual %', 
            v_wallet.account_id, v_wallet.cuenta_virtual_id;
    END LOOP;
    
    RAISE NOTICE 'Total de registros retroactivos creados: %', v_count;
END $$;

-- Verificación final
SELECT 
    'Registros de vinculación en LemonwayTransaction' as info,
    COUNT(*) as cantidad
FROM public."LemonwayTransaction"
WHERE type = 'SYSTEM' 
  AND metadata->>'action' IN ('wallet_link', 'update_wallet_link');

SELECT 
    'Wallets vinculados con registro en LemonwayTransaction' as info,
    COUNT(DISTINCT pa.account_id) as cantidad
FROM payments.payment_accounts pa
INNER JOIN virtual_accounts.cuentas_virtuales cv ON pa.cuenta_virtual_id = cv.id
INNER JOIN public."LemonwayTransaction" lt ON lt.wallet_id = pa.account_id
WHERE pa.status = '6'
  AND lt.type = 'SYSTEM'
  AND lt.metadata->>'action' IN ('wallet_link', 'update_wallet_link');
