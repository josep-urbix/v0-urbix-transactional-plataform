-- Restore default Lemonway configuration
INSERT INTO "LemonwayConfig" (
  environment,
  wallet_id,
  api_token,
  oauth_url,
  accounts_retrieve_url,
  transactions_list_url,
  max_concurrent_requests,
  min_delay_between_requests_ms
)
VALUES (
  'sandbox',
  '105',
  'c65625d2-9851-4915-8d62-272a8ece21aa',
  'https://sandbox-api.lemonway.fr/mb/urbix-prueba/prod/oauth2/v1/token',
  'https://sandbox-api.lemonway.fr/mb/urbix-prueba/prod/accounts/v1/retrieve',
  'https://sandbox-api.lemonway.fr/mb/urbix-prueba/prod/transactions/v1/list',
  3,
  1000
)
ON CONFLICT (id) DO UPDATE SET
  environment = EXCLUDED.environment,
  wallet_id = EXCLUDED.wallet_id,
  api_token = EXCLUDED.api_token,
  oauth_url = EXCLUDED.oauth_url,
  accounts_retrieve_url = EXCLUDED.accounts_retrieve_url,
  transactions_list_url = EXCLUDED.transactions_list_url,
  max_concurrent_requests = EXCLUDED.max_concurrent_requests,
  min_delay_between_requests_ms = EXCLUDED.min_delay_between_requests_ms,
  updated_at = CURRENT_TIMESTAMP;
