# Mapeo de Campos: API Lemonway → Base de Datos

Esta tabla muestra el mapeo entre los campos que devuelve el API de Lemonway al sincronizar cuentas y los campos en la tabla `payments.payment_accounts`.

## Tabla: payments.payment_accounts

| Campo API Lemonway | Campo Base de Datos | Tipo DB | Transformación | Notas |
|-------------------|---------------------|---------|----------------|-------|
| `id` | `id` | VARCHAR | Directo | ID único de la cuenta en Lemonway |
| `email` | `email` | VARCHAR | Directo | Email del titular |
| `firstname` | `firstname` | VARCHAR | Directo | Nombre del titular |
| `lastname` | `lastname` | VARCHAR | Directo | Apellido del titular |
| `company.name` | `company_name` | VARCHAR | Directo | Nombre de la empresa (si aplica) |
| `company.description` | `company_description` | TEXT | Directo | Descripción de la empresa |
| `company.websiteUrl` | `company_website` | VARCHAR | Directo | Sitio web de la empresa |
| `company.identificationNumber` | `company_identification_number` | VARCHAR | Directo | NIF/CIF de la empresa |
| `balance` | `balance` | NUMERIC | `/100` | Balance en centavos → euros |
| `currency` | `currency` | VARCHAR | Directo | Moneda (EUR, USD, etc.) |
| `status` | `status` | INTEGER | Directo | Código de status original de Lemonway |
| `kycStatus` | `kyc_status` | INTEGER | Directo | Código KYC original de Lemonway |
| `kycLevel` | `kyc_level` | INTEGER | Directo | Nivel de KYC (0-5) |
| `accountType` | `account_type` | INTEGER | Directo | Tipo de cuenta |
| `phoneNumber` | `phone_number` | VARCHAR | Directo | Teléfono fijo |
| `mobileNumber` | `mobile_number` | VARCHAR | Directo | Teléfono móvil |
| `adresse.street` | `street` | TEXT | Directo | Calle y número |
| `adresse.city` | `city` | VARCHAR | Directo | Ciudad |
| `adresse.postCode` | `post_code` | VARCHAR | Directo | Código postal |
| `adresse.country` | `country` | VARCHAR | Directo | Código país ISO (ESP, FRA, etc.) |
| `isDebtor` | `is_debtor` | BOOLEAN | Directo | ¿Es deudor? |
| `payerOrBeneficiary` | `payer_or_beneficiary` | INTEGER | Directo | 1=payer, 2=beneficiary |
| `isblocked` | `is_blocked` | BOOLEAN | Directo | ¿Está bloqueada la cuenta? |
| `nationality` | `nationality` | VARCHAR | Directo | Nacionalidad |
| `clientTitle` | `client_title` | VARCHAR | Directo | Título (Mr, Mrs, etc.) |
| `birth.date` | `birth_date` | DATE | DD/MM/YYYY → YYYY-MM-DD | Fecha de nacimiento |
| `birth.city` | `birth_city` | VARCHAR | Directo | Ciudad de nacimiento |
| `birth.Country` | `birth_country` | VARCHAR | Directo | País de nacimiento |
| `internalId` | `internal_id` | INTEGER | Directo | ID interno de Lemonway |
| `(todo el objeto)` | `raw_data` | JSONB | JSON.stringify() | Respuesta completa del API |
| - | `metadata` | JSONB | Custom | Metadatos adicionales personalizados |
| - | `last_sync_at` | TIMESTAMP | NOW() | Marca de tiempo de sincronización |
| - | `created_at` | TIMESTAMP | NOW() (auto) | Fecha de creación del registro |
| - | `updated_at` | TIMESTAMP | NOW() (auto) | Fecha de última actualización |

## Tabla: public.LemonwayApiCallLog

| Campo | Tipo DB | Descripción |
|-------|---------|-------------|
| `id` | INTEGER | ID auto-incremental |
| `request_id` | VARCHAR | ID único de la petición |
| `endpoint` | VARCHAR | Endpoint del API llamado |
| `method` | VARCHAR | Método HTTP (GET, POST, etc.) |
| `request_payload` | JSONB | Payload de la petición |
| `response_payload` | JSONB | Payload de la respuesta |
| `response_status` | INTEGER | Código HTTP de respuesta |
| `success` | BOOLEAN | Si la llamada fue exitosa |
| `error_message` | TEXT | Mensaje de error (si aplica) |
| `duration_ms` | INTEGER | Duración en milisegundos |
| `retry_count` | INTEGER | Número de reintentos realizados |
| `retry_status` | VARCHAR | Estado del reintento (none, pending, success, failed) |
| `next_retry_at` | TIMESTAMP | Próximo intento programado |
| `final_failure` | BOOLEAN | Si es un fallo definitivo |
| `manual_retry_needed` | BOOLEAN | Si requiere reintento manual |
| `processing_lock_at` | TIMESTAMP WITH TZ | Lock para evitar procesamiento concurrente |
| `sent_at` | TIMESTAMP WITH TZ | Momento en que se envió la petición |
| `created_at` | TIMESTAMP | Fecha de creación |
| `deleted_at` | TIMESTAMP | Soft delete (si aplica) |

## Tabla: public.LemonwayApiCallRetryHistory

| Campo | Tipo DB | Descripción |
|-------|---------|-------------|
| `id` | INTEGER | ID auto-incremental |
| `api_call_log_id` | INTEGER | FK a LemonwayApiCallLog.id |
| `attempt_number` | INTEGER | Número del intento (0 = inicial) |
| `response_status` | INTEGER | Código HTTP de la respuesta |
| `success` | BOOLEAN | Si el intento fue exitoso |
| `error_message` | TEXT | Mensaje de error (si aplica) |
| `duration_ms` | INTEGER | Duración en milisegundos |
| `response_payload` | JSONB | Payload de la respuesta |
| `created_at` | TIMESTAMP WITH TZ | Fecha del intento |

## Tabla: public.LemonwayConfig

| Campo | Tipo DB | Descripción |
|-------|---------|-------------|
| `id` | INTEGER | ID auto-incremental |
| `environment` | TEXT | Entorno (sandbox, production) |
| `environment_name` | TEXT | Nombre descriptivo del entorno |
| `api_token` | TEXT | Token de autenticación OAuth |
| `wallet_id` | TEXT | ID del wallet principal |
| `oauth_url` | TEXT | URL para obtener token OAuth |
| `accounts_retrieve_url` | TEXT | URL para obtener cuentas |
| `accounts_balances_url` | TEXT | URL para obtener balances |
| `accounts_kycstatus_url` | TEXT | URL para verificar KYC |
| `transactions_list_url` | TEXT | URL para listar transacciones |
| `endpoint_urls` | JSONB | URLs adicionales de endpoints |
| `max_concurrent_requests` | INTEGER | Máximo de peticiones concurrentes |
| `min_delay_between_requests_ms` | INTEGER | Delay mínimo entre peticiones (ms) |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

## Tabla: public.LemonwayTransaction

| Campo | Tipo DB | Descripción |
|-------|---------|-------------|
| `id` | INTEGER | ID auto-incremental |
| `transaction_id` | VARCHAR | ID único de la transacción en Lemonway |
| `wallet_id` | VARCHAR | ID del wallet asociado |
| `type` | VARCHAR | Tipo de transacción |
| `direction` | VARCHAR | Dirección (in, out) |
| `amount` | NUMERIC | Monto de la transacción |
| `currency` | VARCHAR | Moneda |
| `status` | VARCHAR | Estado de la transacción |
| `debit_wallet` | VARCHAR | Wallet de origen |
| `credit_wallet` | VARCHAR | Wallet de destino |
| `comment` | TEXT | Comentario |
| `description` | TEXT | Descripción |
| `error_message` | TEXT | Mensaje de error (si aplica) |
| `request_payload` | JSONB | Payload de la petición |
| `response_payload` | JSONB | Payload de la respuesta |
| `raw_payload` | JSONB | Respuesta original completa |
| `metadata` | JSONB | Metadatos adicionales |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

## Tabla: public.LemonwayWallet

| Campo | Tipo DB | Descripción |
|-------|---------|-------------|
| `id` | INTEGER | ID auto-incremental |
| `wallet_id` | VARCHAR | ID del wallet en Lemonway |
| `balance` | NUMERIC | Balance actual |
| `status` | VARCHAR | Estado del wallet |
| `kyc_status` | VARCHAR | Estado KYC |
| `kyc_level` | INTEGER | Nivel KYC |
| `user_type` | VARCHAR | Tipo de usuario |
| `user_email` | VARCHAR | Email del usuario |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de última actualización |

## Mapeo de Status

| Valor API | Valor DB | Descripción |
|-----------|----------|-------------|
| `status: 6` | `active` | Cuenta activa |
| `isblocked: true` | `blocked` | Cuenta bloqueada |
| Otros | `active` | Por defecto activa |

## Mapeo de KYC Status

| Valor API | Valor DB | Descripción |
|-----------|----------|-------------|
| `0` | `none` | Sin verificación KYC |
| `1` | `pending` | KYC pendiente |
| `2` | `validated` | KYC validado |
| `3` | `refused` | KYC rechazado |

## Mapeo de Retry Status

| Valor | Descripción |
|-------|-------------|
| `none` | Sin reintento (éxito en primer intento) |
| `pending` | Pendiente de reintento |
| `success` | Reintento exitoso |
| `failed` | Fallo definitivo tras agotar reintentos |
| `limit_pending` | En cola esperando procesamiento |

## Ejemplo de Respuesta API para Cuenta

\`\`\`json
{
  "id": "154",
  "email": "user154@example.com",
  "firstname": "Leonardo",
  "lastname": "Romaní",
  "balance": 530000,
  "status": 6,
  "accountType": 0,
  "phoneNumber": "",
  "mobileNumber": "0612121212",
  "nationality": "FRA",
  "clientTitle": "U",
  "isblocked": false,
  "isDebtor": false,
  "payerOrBeneficiary": 1,
  "internalId": 35,
  "adresse": {
    "street": "Rue de la sandbox",
    "city": "Sandbox city",
    "postCode": "99999",
    "country": "ESP"
  },
  "birth": {
    "date": "03/11/2000",
    "city": "Rue de la sandbox",
    "Country": "ESP"
  },
  "company": {
    "name": "",
    "websiteUrl": "",
    "description": "",
    "identificationNumber": ""
  }
}
\`\`\`

## Notas Importantes

1. **Balance**: Siempre viene en centavos desde el API y se divide por 100 para almacenar en euros
2. **Fechas**: Las fechas de nacimiento vienen en formato DD/MM/YYYY y se convierten a YYYY-MM-DD (ISO 8601)
3. **Status**: El mapeo de status es condicional basándose en múltiples campos
4. **Country**: Códigos ISO 3166-1 alpha-3 (3 letras): ESP, FRA, USA
5. **Raw Data**: Siempre se guarda la respuesta completa del API para referencia
6. **Timestamps**: Se registra la última sincronización en `last_sync_at`
7. **Retry Status**: El sistema de reintentos usa `none` para éxitos en primer intento y `success` para reintentos exitosos
8. **Processing Lock**: Se usa `processing_lock_at` para evitar procesamiento concurrente de la misma transacción
