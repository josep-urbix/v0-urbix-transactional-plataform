-- Script para actualizar cuentas virtuales ya vinculadas con datos de Lemonway
-- Rellena los campos: lemonway_account_id, lemonway_internal_id, email, vinculacion_timestamp

DO $$
DECLARE
    v_updated_count INTEGER := 0;
    v_wallet RECORD;
BEGIN
    -- Recorrer todos los wallets vinculados con status=6
    FOR v_wallet IN 
        SELECT 
            pa.id as payment_account_id,
            pa.account_id,
            pa.internal_id,
            pa.email,
            pa.cuenta_virtual_id,
            cv.lemonway_account_id as current_lemonway_account_id
        FROM payments.payment_accounts pa
        INNER JOIN virtual_accounts.cuentas_virtuales cv ON pa.cuenta_virtual_id = cv.id
        WHERE pa.status = '6' 
          AND pa.cuenta_virtual_id IS NOT NULL
          AND (cv.lemonway_account_id IS NULL OR cv.lemonway_account_id != pa.account_id)
    LOOP
        -- Actualizar la cuenta virtual con datos de Lemonway
        UPDATE virtual_accounts.cuentas_virtuales
        SET 
            lemonway_account_id = v_wallet.account_id,
            lemonway_internal_id = v_wallet.internal_id,
            email = v_wallet.email,
            vinculacion_timestamp = COALESCE(vinculacion_timestamp, NOW()),
            vinculacion_bloqueada = false
        WHERE id = v_wallet.cuenta_virtual_id;
        
        v_updated_count := v_updated_count + 1;
        
        -- Registrar en LemonwayTransaction
        INSERT INTO public."LemonwayTransaction" (
            transaction_id,
            wallet_id,
            amount,
            currency,
            status,
            type,
            direction,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            'SYNC_LINK_' || v_wallet.cuenta_virtual_id || '_' || EXTRACT(EPOCH FROM NOW())::TEXT,
            v_wallet.account_id,
            0,
            'EUR',
            'COMPLETED',
            'SYSTEM',
            'INTERNAL',
            jsonb_build_object(
                'action', 'update_wallet_link',
                'payment_account_id', v_wallet.payment_account_id,
                'cuenta_virtual_id', v_wallet.cuenta_virtual_id,
                'account_id', v_wallet.account_id,
                'internal_id', v_wallet.internal_id,
                'email', v_wallet.email,
                'timestamp', NOW()
            ),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Actualizada cuenta virtual % para wallet %', v_wallet.cuenta_virtual_id, v_wallet.account_id;
    END LOOP;
    
    RAISE NOTICE 'Total de cuentas virtuales actualizadas: %', v_updated_count;
END $$;

-- Verificación final
SELECT 
    'Cuentas virtuales con datos de Lemonway' as info,
    COUNT(*) as cantidad
FROM virtual_accounts.cuentas_virtuales
WHERE lemonway_account_id IS NOT NULL;

SELECT 
    'Registros de vinculación en LemonwayTransaction' as info,
    COUNT(*) as cantidad
FROM public."LemonwayTransaction"
WHERE type = 'SYSTEM' 
  AND metadata->>'action' IN ('wallet_link', 'update_wallet_link');
