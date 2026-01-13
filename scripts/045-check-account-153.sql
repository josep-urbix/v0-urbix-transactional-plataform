-- Verificar todos los datos de la cuenta 153
SELECT 
    account_id,
    email,
    first_name,
    last_name,
    mobile_number,
    phone_number,
    birth_date,
    birth_city,
    birth_country,
    postal_code,
    internal_id,
    client_title,
    payer_or_beneficiary,
    kyc_status,
    kyc_level,
    balance,
    status,
    last_sync_at,
    updated_at
FROM payments.payment_accounts
WHERE account_id = '153';
