# Lemonway API - Documentación Exhaustiva

## Índice

1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Configuración](#configuración)
4. [Autenticación](#autenticación)
5. [Rate Limiting y Cola de Peticiones](#rate-limiting-y-cola-de-peticiones)
6. [Métodos de API Disponibles](#métodos-de-api-disponibles)
7. [Sistema de Reintentos](#sistema-de-reintentos)
8. [Logs y Auditoría](#logs-y-auditoría)
9. [API Explorer](#api-explorer)
10. [Sincronización de Datos](#sincronización-de-datos)
11. [Manejo de Errores](#manejo-de-errores)
12. [Ejemplos de Uso](#ejemplos-de-uso)
13. [Troubleshooting](#troubleshooting)

---

## Introducción

Este documento proporciona una guía exhaustiva de la integración con la API REST v2 de Lemonway implementada en el sistema URBIX. Lemonway es una plataforma de pago europea que proporciona servicios de wallet electrónico, procesamiento de pagos y cumplimiento regulatorio (KYC/AML).

### Características Principales

- **OAuth 2.0**: Autenticación mediante tokens Bearer con validez de 90 días
- **Rate Limiting Inteligente**: Sistema de colas con límites configurables
- **Reintentos Automáticos**: Sistema robusto de reintentos con historial completo
- **API Explorer**: Interfaz web para probar endpoints y ver documentación
- **Sincronización**: Actualización automática de datos en base de datos local
- **Auditoría Completa**: Registro de todas las llamadas con métricas y trazabilidad

---

## Arquitectura

### Componentes del Sistema

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    URBIX Application                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐       ┌──────────────────┐           │
│  │  API Explorer    │◄──────┤  LemonwayClient  │           │
│  │  (UI)            │       │  (Core Library)  │           │
│  └──────────────────┘       └────────┬─────────┘           │
│                                       │                      │
│  ┌──────────────────┐       ┌────────▼─────────┐           │
│  │  Retry System    │◄──────┤  Request Queue   │           │
│  │  (Background)    │       │  (Rate Limiting) │           │
│  └──────────────────┘       └────────┬─────────┘           │
│                                       │                      │
│  ┌──────────────────┐       ┌────────▼─────────┐           │
│  │  Database Sync   │◄──────┤  API Call Logs   │           │
│  │  (payment_accts) │       │  (Audit Trail)   │           │
│  └──────────────────┘       └──────────────────┘           │
│                                       │                      │
└───────────────────────────────────────┼─────────────────────┘
                                        │
                                        ▼
                            ┌───────────────────┐
                            │  Lemonway API v2  │
                            │  (REST/OAuth 2.0) │
                            └───────────────────┘
\`\`\`

### Flujo de una Petición

1. **Solicitud Inicial**: Cliente llama a un método del `LemonwayClient`
2. **Verificación de Método**: Comprueba si el método está habilitado en `lemonway_api_methods`
3. **Autenticación**: Obtiene/reutiliza token Bearer OAuth 2.0
4. **Encolado**: Petición se añade a la cola con rate limiting
5. **Ejecución**: Request se envía a Lemonway API
6. **Logging**: Se registra en `LemonwayApiCallLog` con todos los detalles
7. **Reintentos**: Si falla, se programa reintento automático
8. **Sincronización**: Si es exitoso, sincroniza datos en base de datos local
9. **Respuesta**: Devuelve resultado al cliente

---

## Configuración

### Tabla de Configuración: `LemonwayConfig`

Almacena la configuración global de Lemonway en base de datos.

\`\`\`sql
CREATE TABLE "LemonwayConfig" (
  id SERIAL PRIMARY KEY,
  environment TEXT NOT NULL,           -- 'sandbox' o 'production'
  api_token TEXT NOT NULL,             -- Token de API (base64)
  environment_name TEXT,               -- Nombre del entorno (ej: 'urbix')
  wallet_id TEXT,                      -- Wallet principal de la empresa
  webhook_secret TEXT,                 -- Secret para validar webhooks
  company_name TEXT,
  company_website TEXT,
  max_concurrent_requests INT DEFAULT 3,
  min_delay_between_requests_ms INT DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### Variables de Entorno

El sistema NO requiere variables de entorno. Toda la configuración se gestiona desde la base de datos.

### Obtener Configuración

\`\`\`typescript
const config = await LemonwayClient.getConfig();

if (!config) {
  throw new Error('No hay configuración de Lemonway');
}

const client = new LemonwayClient(config);
\`\`\`

### URLs de API

**Sandbox**:
- OAuth: `https://sandbox-api.lemonway.fr/oauth/api/v1/oauth/token`
- API Base: `https://sandbox-api.lemonway.fr/mb/{env_name}/dev/directkitrest/v2`

**Production**:
- OAuth: `https://api.lemonway.com/oauth/api/v1/oauth/token`
- API Base: `https://api.lemonway.fr/mb/{env_name}/prod/directkitrest/v2`

---

## Autenticación

### OAuth 2.0 Flow

Lemonway utiliza OAuth 2.0 con flujo de **Client Credentials**.

#### 1. Obtener Token

\`\`\`typescript
async getBearerToken(): Promise<string>
\`\`\`

**Request**:
\`\`\`http
POST /oauth/api/v1/oauth/token
Authorization: Basic {api_token}
Content-Type: application/x-www-form-urlencoded

Grant_type=client_credentials
\`\`\`

**Response**:
\`\`\`json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 7776000  // 90 días en segundos
}
\`\`\`

#### 2. Uso del Token

Todas las llamadas posteriores incluyen el token en el header:

\`\`\`http
Authorization: Bearer {access_token}
\`\`\`

#### 3. Gestión de Tokens

- **Caché automático**: El token se almacena en memoria
- **Renovación automática**: Se renueva solo cuando expira
- **Validez**: 90 días desde la emisión

**Ejemplo de uso**:

\`\`\`typescript
const config = await LemonwayClient.getConfig();
const client = new LemonwayClient(config);

// El token se obtiene automáticamente en la primera llamada
const accounts = await client.getAccountDetails('WALLET123');
\`\`\`

---

## Rate Limiting y Cola de Peticiones

### Sistema de Colas

El cliente implementa un sistema de colas para evitar sobrepasar los límites de Lemonway.

#### Parámetros Configurables

\`\`\`typescript
interface LemonwayConfig {
  maxConcurrentRequests?: number;      // Default: 3
  minDelayBetweenRequestsMs?: number;  // Default: 1000ms
}
\`\`\`

#### Funcionamiento

1. **Encolado**: Todas las peticiones pasan por `queueRequest()`
2. **Control de Concurrencia**: Máximo N peticiones simultáneas
3. **Espaciado Temporal**: Mínimo X ms entre peticiones
4. **Procesamiento FIFO**: First In, First Out

#### Ejemplo de Cola

\`\`\`typescript
// Múltiples llamadas se encolan automáticamente
const results = await Promise.all([
  client.getAccountDetails('WALLET001'),
  client.getAccountDetails('WALLET002'),
  client.getAccountDetails('WALLET003'),
  client.getAccountDetails('WALLET004'),
  client.getAccountDetails('WALLET005'),
]);

// Internamente se ejecutan con rate limiting:
// - Máximo 3 simultáneas
// - Mínimo 1 segundo entre cada una
\`\`\`

#### Estadísticas de Cola

\`\`\`typescript
const stats = client.getQueueStats();
console.log(stats);
// {
//   queueSize: 2,        // Peticiones en cola
//   activeRequests: 3,   // Peticiones en ejecución
//   isProcessing: true   // Procesador activo
// }
\`\`\`

---

## Métodos de API Disponibles

### 1. Authentication

#### `getBearerToken()`

Obtiene token OAuth 2.0 para autenticar peticiones.

**Firma**:
\`\`\`typescript
async getBearerToken(): Promise<string>
\`\`\`

**Ejemplo**:
\`\`\`typescript
const token = await client.getBearerToken();
console.log('Token:', token);
\`\`\`

**Respuesta**:
\`\`\`json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 7776000
}
\`\`\`

**Notas**:
- El token se cachea automáticamente
- Validez de 90 días
- Se renueva automáticamente al expirar

---

### 2. Accounts

#### `getAccountDetails(accountId, email?)`

Obtiene los detalles completos de una cuenta específica.

**Firma**:
\`\`\`typescript
async getAccountDetails(
  accountId: string, 
  email?: string
): Promise<any>
\`\`\`

**Parámetros**:
- `accountId` (string, required): ID de la cuenta en Lemonway
- `email` (string, optional): Email alternativo para búsqueda

**Endpoint**: `POST /accounts/retrieve`

**Request Body**:
\`\`\`json
{
  "accounts": [
    {
      "accountid": "WALLET123",
      "email": ""
    }
  ]
}
\`\`\`

**Response**:
\`\`\`json
{
  "accounts": [
    {
      "id": "WALLET123",
      "email": "user@example.com",
      "firstname": "John",
      "lastname": "Doe",
      "balance": 150000,  // En centavos (1500.00 EUR)
      "status": 5,        // 5 = ACTIVE
      "kycStatus": 1,     // 1 = VALIDATED
      "accountType": 1,   // 1 = Individual
      "adresse": {
        "street": "123 Main St",
        "city": "Paris",
        "postCode": "75001",
        "country": "FR"
      },
      "birth": {
        "date": "15/03/1990",
        "city": "Lyon",
        "Country": "FR"
      }
    }
  ]
}
\`\`\`

**Ejemplo de Uso**:
\`\`\`typescript
const account = await client.getAccountDetails('WALLET123');

console.log('Balance:', account.accounts[0].balance / 100, 'EUR');
console.log('Status:', account.accounts[0].status);
console.log('KYC Status:', account.accounts[0].kycStatus);
\`\`\`

**Sincronización Automática**:
- ✅ Los datos se sincronizan automáticamente en `payments.payment_accounts`
- ✅ Balance se convierte de centavos a euros
- ✅ Fechas se formatean correctamente (DD/MM/YYYY → YYYY-MM-DD)

---

#### `getAccountsByIds(accountIds)`

Obtiene detalles de múltiples cuentas en una sola llamada.

**Firma**:
\`\`\`typescript
async getAccountsByIds(accountIds: string[]): Promise<any>
\`\`\`

**Parámetros**:
- `accountIds` (string[], required): Array de IDs de cuentas

**Endpoint**: `POST /accounts/retrieve`

**Request Body**:
\`\`\`json
{
  "accounts": [
    { "accountid": "WALLET123", "email": "" },
    { "accountid": "WALLET456", "email": "" },
    { "accountid": "WALLET789", "email": "" }
  ]
}
\`\`\`

**Response**:
\`\`\`json
{
  "accounts": [
    {
      "id": "WALLET123",
      "email": "user1@example.com",
      "balance": 150000
    },
    {
      "id": "WALLET456",
      "email": "user2@example.com",
      "balance": 280000
    },
    {
      "id": "WALLET789",
      "email": "user3@example.com",
      "balance": 50000
    }
  ]
}
\`\`\`

**Ejemplo de Uso**:
\`\`\`typescript
const accountIds = ['WALLET123', 'WALLET456', 'WALLET789'];
const result = await client.getAccountsByIds(accountIds);

result.accounts.forEach(account => {
  console.log(`${account.id}: ${account.balance / 100} EUR`);
});
\`\`\`

**Límites**:
- Máximo recomendado: 50 cuentas por llamada
- Para más cuentas, dividir en múltiples llamadas

---

#### `getKycStatus(updateDate?, page?, limit?)`

Obtiene el estado KYC (Know Your Customer) de cuentas.

**Firma**:
\`\`\`typescript
async getKycStatus(
  updateDate?: string,
  page?: number,
  limit?: number
): Promise<any>
\`\`\`

**Parámetros**:
- `updateDate` (string, optional): Fecha en formato ISO (YYYY-MM-DD)
- `page` (number, optional): Página de resultados
- `limit` (number, optional): Resultados por página

**Endpoint**: `GET /accounts/kycstatus`

**Query Parameters**:
\`\`\`
?updateDate=2024-01-01&page=1&limit=50
\`\`\`

**Response**:
\`\`\`json
{
  "accounts": [
    {
      "accountId": "WALLET123",
      "kycStatus": 1,      // 0=None, 1=Validated, 2=Refused
      "kycLevel": 2,       // Nivel de verificación alcanzado
      "verifiedAt": "2024-01-15T10:30:00Z",
      "documents": [
        {
          "type": "ID_CARD",
          "status": "APPROVED",
          "uploadedAt": "2024-01-10T14:20:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150
  }
}
\`\`\`

**Estados KYC**:
- `0`: Sin verificación
- `1`: Validado
- `2`: Rechazado

**Ejemplo de Uso**:
\`\`\`typescript
// Obtener cuentas actualizadas desde una fecha
const kyc = await client.getKycStatus('2024-01-01', 1, 50);

kyc.accounts.forEach(account => {
  console.log(`${account.accountId}: KYC Status = ${account.kycStatus}`);
});
\`\`\`

---

### 3. Transactions

#### `getTransactions(walletId?, startDate?, endDate?)`

Lista las transacciones de una cuenta con filtros opcionales.

**Firma**:
\`\`\`typescript
async getTransactions(
  walletId?: string,
  startDate?: string,
  endDate?: string
): Promise<any>
\`\`\`

**Parámetros**:
- `walletId` (string, optional): ID de la wallet
- `startDate` (string, optional): Fecha inicio (YYYY-MM-DD)
- `endDate` (string, optional): Fecha fin (YYYY-MM-DD)

**Endpoint**: `POST /transactions/list`

**Request Body**:
\`\`\`json
{
  "wallet": "WALLET123",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
\`\`\`

**Response**:
\`\`\`json
{
  "transactions": [
    {
      "id": "TXN001",
      "date": "2024-01-15T10:00:00Z",
      "type": "money_in",
      "amount": 10000,    // En centavos
      "currency": "EUR",
      "status": "completed",
      "debitWallet": null,
      "creditWallet": "WALLET123",
      "comment": "Deposit",
      "metadata": {}
    },
    {
      "id": "TXN002",
      "date": "2024-01-20T15:30:00Z",
      "type": "p2p",
      "amount": 5000,
      "currency": "EUR",
      "status": "completed",
      "debitWallet": "WALLET123",
      "creditWallet": "WALLET456",
      "comment": "Payment for services"
    }
  ],
  "pagination": {
    "total": 2,
    "page": 1,
    "limit": 50
  }
}
\`\`\`

**Tipos de Transacciones**:
- `money_in`: Ingreso a la wallet
- `money_out`: Retiro de la wallet
- `p2p`: Transferencia entre wallets
- `split`: División de pago

**Estados**:
- `pending`: Pendiente de procesamiento
- `completed`: Completada exitosamente
- `failed`: Fallida
- `cancelled`: Cancelada

**Ejemplo de Uso**:
\`\`\`typescript
// Obtener transacciones del mes actual
const now = new Date();
const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  .toISOString().split('T')[0];
const endDate = now.toISOString().split('T')[0];

const result = await client.getTransactions('WALLET123', startDate, endDate);

console.log(`Total transacciones: ${result.transactions.length}`);

result.transactions.forEach(txn => {
  console.log(`${txn.id}: ${txn.type} - ${txn.amount / 100} EUR`);
});
\`\`\`

---

### 4. Payments

#### `sendPayment(data)` ⚠️ DESHABILITADO

Envía un pago P2P entre wallets (actualmente no implementado).

**Estado**: `is_enabled = false`

**Firma**:
\`\`\`typescript
async sendPayment(data: any): Promise<any>
\`\`\`

**Endpoint**: `POST /payments/send`

**Request Body**:
\`\`\`json
{
  "debitWallet": "WALLET123",
  "creditWallet": "WALLET456",
  "amount": 10000,        // En centavos
  "currency": "EUR",
  "comment": "Payment for services"
}
\`\`\`

**Notas**:
- ⚠️ Método deshabilitado en API Explorer
- ⚠️ Requiere implementación completa
- ⚠️ Debe validar saldo antes de ejecutar

---

## Sistema de Reintentos

### Arquitectura de Reintentos

El sistema implementa un robusto mecanismo de reintentos automáticos con historial completo.

#### Tablas Involucradas

1. **`LemonwayApiCallLog`**: Log principal de llamadas
2. **`LemonwayApiCallRetryHistory`**: Historial de cada intento
3. **`LemonwayRetryConfig`**: Configuración de reintentos

### Flujo de Reintentos

\`\`\`
┌─────────────┐
│ API Call    │
│ (Failed)    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│ LemonwayApiCallLog              │
│ - retry_status = 'pending'      │
│ - retry_count = 0               │
│ - next_retry_at = NOW() + 5s    │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ Background Cron Job             │
│ (Every minute)                  │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ processRetryQueue()             │
│ - Find pending retries          │
│ - Acquire lock                  │
│ - Execute retry                 │
│ - Save to history               │
└──────┬──────────────────────────┘
       │
       ├─── Success ─────►  retry_status = 'success'
       │                    retry_count++
       │
       └─── Failed ──────►  retry_count++
                           next_retry_at = NOW() + delay
                           
                           If retry_count >= max:
                             retry_status = 'failed'
                             final_failure = true
\`\`\`

### Configuración de Reintentos

\`\`\`sql
SELECT * FROM "LemonwayRetryConfig" ORDER BY id DESC LIMIT 1;
\`\`\`

**Valores Default**:
\`\`\`json
{
  "maxRetryAttempts": 3,
  "retryDelaySeconds": 5,
  "manualRetryEnabled": true
}
\`\`\`

### Estados de Reintento

| Estado | Descripción |
|--------|-------------|
| `none` | Sin reintentos (éxito en primer intento) |
| `pending` | Esperando reintento |
| `processing` | En proceso de reintento |
| `success` | Reintento exitoso |
| `failed` | Fallado después de max intentos |
| `limit_pending` | Rate limit alcanzado (429) |

### Reintentar Manualmente

\`\`\`typescript
// API endpoint
POST /api/lemonway/retry-failed-call
{
  "logId": 123
}

// Programático
import { retryFailedCall } from '@/lib/lemonway-client';

const result = await retryFailedCall(logId);
console.log(result);
// {
//   success: true,
//   message: "Reintento #2 exitoso",
//   newLogId: 123
// }
\`\`\`

### Historial de Reintentos

Cada intento se guarda en `LemonwayApiCallRetryHistory`:

\`\`\`sql
SELECT 
  attempt_number,
  response_status,
  success,
  error_message,
  duration_ms,
  created_at
FROM "LemonwayApiCallRetryHistory"
WHERE api_call_log_id = 123
ORDER BY attempt_number;
\`\`\`

**Ejemplo de Historial**:
\`\`\`
attempt | status | success | error_message      | duration
--------|--------|---------|--------------------|---------
   0    |  403   | false   | IP not whitelisted | 1250ms
   1    |  403   | false   | IP not whitelisted | 1180ms
   2    |  200   | true    | null               | 850ms
\`\`\`

---

## Logs y Auditoría

### Tabla `LemonwayApiCallLog`

Cada llamada a la API de Lemonway se registra con detalles completos.

**Campos Principales**:

\`\`\`sql
CREATE TABLE "LemonwayApiCallLog" (
  id SERIAL PRIMARY KEY,
  request_id TEXT,                  -- ID único para agrupar reintentos
  endpoint TEXT NOT NULL,           -- Ej: '/accounts/retrieve'
  method TEXT NOT NULL,             -- 'GET' o 'POST'
  request_payload JSONB,            -- Body de la request
  response_payload JSONB,           -- Body de la response
  response_status INT,              -- HTTP status code
  success BOOLEAN,                  -- true si 2xx
  error_message TEXT,               -- Error si falló
  duration_ms INT,                  -- Tiempo de ejecución
  retry_count INT DEFAULT 0,        -- Número de reintentos
  retry_status TEXT DEFAULT 'none', -- Estado de reintento
  next_retry_at TIMESTAMP,          -- Cuándo reintentar
  final_failure BOOLEAN DEFAULT false,
  manual_retry_needed BOOLEAN DEFAULT false,
  processing_lock_at TIMESTAMP,     -- Lock para evitar duplicados
  sent_at TIMESTAMP,                -- Cuándo se envió
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

### Consultar Logs

**Logs recientes**:
\`\`\`sql
SELECT 
  id,
  endpoint,
  method,
  response_status,
  success,
  error_message,
  duration_ms,
  retry_count,
  retry_status,
  created_at
FROM "LemonwayApiCallLog"
ORDER BY created_at DESC
LIMIT 50;
\`\`\`

**Logs fallidos**:
\`\`\`sql
SELECT *
FROM "LemonwayApiCallLog"
WHERE success = false
  AND final_failure = false
ORDER BY created_at DESC;
\`\`\`

**Estadísticas**:
\`\`\`sql
SELECT 
  endpoint,
  COUNT(*) as total_calls,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed,
  ROUND(AVG(duration_ms)) as avg_duration_ms,
  MAX(duration_ms) as max_duration_ms
FROM "LemonwayApiCallLog"
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY endpoint
ORDER BY total_calls DESC;
\`\`\`

---

## API Explorer

### Interfaz Web

El API Explorer es una interfaz web completa para gestionar y probar los endpoints de Lemonway.

**Acceso**: `/dashboard/lemonway-api-explorer`

**Permisos Requeridos**:
- `lemonway_api:view` - Ver métodos y documentación
- `lemonway_api:test` - Ejecutar llamadas de prueba
- `lemonway_api:toggle` - Activar/desactivar métodos
- `lemonway_api:manage_presets` - Gestionar presets

### Características

#### 1. Lista de Métodos

- Ver todos los métodos disponibles
- Filtrar por categoría (Auth, Accounts, Transactions, etc.)
- Filtrar por estado (Activo/Inactivo)
- Búsqueda por nombre o endpoint
- Toggle para activar/desactivar métodos

#### 2. Detalle de Método

Para cada método se muestra:

- **Nombre y descripción**
- **Endpoint y método HTTP**
- **Estado** (activo/inactivo)
- **Request Schema**: Estructura esperada del request
- **Response Schema**: Estructura de la respuesta
- **Ejemplos**: Request y response de ejemplo

#### 3. Formulario de Prueba

- Formulario interactivo con parámetros pre-rellenados
- Datos de ejemplo automáticos
- Ejecución en tiempo real
- Visualización de request/response
- Métricas de rendimiento (duration_ms, status_code)

#### 4. Historial de Llamadas

- Lista de todas las llamadas realizadas
- Filtros por:
  - Método
  - Fecha (desde/hasta)
  - Estado (éxito/error)
  - Usuario
- Detalles completos de request/response
- Duración y código de estado HTTP

#### 5. Presets

- Guardar configuraciones de parámetros
- Reutilizar configuraciones frecuentes
- Compartir entre usuarios (futuro)

### Gestión de Métodos

**Activar/Desactivar Método**:

\`\`\`typescript
// API endpoint
PUT /api/lemonway-api/methods/{methodId}
{
  "is_enabled": false
}
\`\`\`

Cuando un método está desactivado:
- ❌ No se puede ejecutar desde el código
- ❌ No se puede probar en el explorer
- ✅ Aparece marcado como "Deshabilitado"

**Uso desde código**:

\`\`\`typescript
// Internamente verifica si está habilitado
const account = await client.getAccountDetails('WALLET123');
// Si el método está deshabilitado, lanza:
// Error: El método getAccountDetails está desactivado
\`\`\`

---

## Sincronización de Datos

### Sincronización Automática

Cuando se llama exitosamente a `/accounts/retrieve`, los datos se sincronizan automáticamente en la tabla `payments.payment_accounts`.

#### Tabla `payment_accounts`

\`\`\`sql
CREATE TABLE payments.payment_accounts (
  id SERIAL PRIMARY KEY,
  account_id TEXT UNIQUE NOT NULL,    -- ID de Lemonway
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  balance DECIMAL(15,2),              -- En euros (convertido desde centavos)
  currency TEXT DEFAULT 'EUR',
  status TEXT,                        -- Estado de la cuenta
  kyc_status TEXT DEFAULT 'none',     -- Estado KYC
  account_type TEXT,                  -- Tipo de cuenta
  phone_number TEXT,
  mobile_number TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT,
  is_debtor BOOLEAN DEFAULT false,
  nationality TEXT,
  client_title TEXT,
  birth_date DATE,                    -- Convertido desde DD/MM/YYYY
  birth_city TEXT,
  birth_country TEXT,
  internal_id TEXT,
  is_blocked BOOLEAN DEFAULT false,
  payer_or_beneficiary INT,
  company_description TEXT,
  company_website TEXT,
  company_identification_number TEXT,
  raw_data JSONB,                     -- Respuesta completa de Lemonway
  last_sync_at TIMESTAMP,             -- Última sincronización
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

#### Proceso de Sincronización

1. **Detección Automática**: Si el endpoint contiene `/accounts/retrieve`
2. **Parsing**: Extrae datos de `responsePayload.accounts[]`
3. **Transformación**:
   - Balance: `centavos / 100 → euros`
   - Fecha: `DD/MM/YYYY → YYYY-MM-DD`
   - Status: `número → string`
4. **Upsert**: `INSERT ... ON CONFLICT (account_id) DO UPDATE`

#### Verificar Sincronización

\`\`\`sql
SELECT 
  account_id,
  email,
  balance,
  status,
  kyc_status,
  last_sync_at
FROM payments.payment_accounts
ORDER BY last_sync_at DESC
LIMIT 10;
\`\`\`

### Sincronización Manual

Desde el dashboard de Lemonway:

\`\`\`
/dashboard/lemonway-transactions
→ Botón "Sincronizar Cuentas"
→ Ingresa IDs separados por comas
→ Se ejecuta getAccountsByIds()
→ Sincroniza automáticamente
\`\`\`

---

## Manejo de Errores

### Códigos de Error Comunes

| Código | Significado | Causa | Solución |
|--------|-------------|-------|----------|
| 401 | Unauthorized | Token inválido o expirado | Renovar token OAuth |
| 403 | Forbidden | IP no está en whitelist | Añadir IP en Lemonway dashboard |
| 429 | Too Many Requests | Rate limit excedido | Esperar o ajustar rate limiting |
| 500 | Internal Server Error | Error en Lemonway | Contactar soporte |
| 503 | Service Unavailable | Lemonway en mantenimiento | Reintentar más tarde |

### Errores de Validación

**Respuesta típica**:
\`\`\`json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "Account ID is required",
    "field": "accountId"
  }
}
\`\`\`

### Try-Catch Pattern

\`\`\`typescript
try {
  const account = await client.getAccountDetails('WALLET123');
  console.log('Account balance:', account.accounts[0].balance / 100);
} catch (error: any) {
  if (error.message.includes('403')) {
    console.error('IP not whitelisted in Lemonway');
  } else if (error.message.includes('429')) {
    console.error('Rate limit exceeded, retry later');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
\`\`\`

### Logs de Error

Todos los errores se registran automáticamente en `LemonwayApiCallLog`:

\`\`\`sql
SELECT 
  endpoint,
  error_message,
  response_status,
  response_payload,
  created_at
FROM "LemonwayApiCallLog"
WHERE success = false
ORDER BY created_at DESC
LIMIT 20;
\`\`\`

---

## Ejemplos de Uso

### Ejemplo 1: Obtener Balance de una Cuenta

\`\`\`typescript
import { LemonwayClient } from '@/lib/lemonway-client';

async function getAccountBalance(accountId: string) {
  // Obtener configuración
  const config = await LemonwayClient.getConfig();
  if (!config) {
    throw new Error('Lemonway no está configurado');
  }

  // Crear cliente
  const client = new LemonwayClient(config);

  // Obtener detalles de la cuenta
  const result = await client.getAccountDetails(accountId);
  
  if (!result.accounts || result.accounts.length === 0) {
    throw new Error('Cuenta no encontrada');
  }

  const account = result.accounts[0];
  const balanceEur = account.balance / 100;

  return {
    accountId: account.id,
    email: account.email,
    balance: balanceEur,
    currency: 'EUR',
    status: account.status,
    kycStatus: account.kycStatus
  };
}

// Uso
const balance = await getAccountBalance('WALLET123');
console.log(`Balance: ${balance.balance} EUR`);
\`\`\`

### Ejemplo 2: Sincronizar Múltiples Cuentas

\`\`\`typescript
import { LemonwayClient } from '@/lib/lemonway-client';

async function syncMultipleAccounts(accountIds: string[]) {
  const config = await LemonwayClient.getConfig();
  const client = new LemonwayClient(config);

  // Dividir en chunks de 50 (recomendado)
  const chunkSize = 50;
  const chunks = [];
  
  for (let i = 0; i < accountIds.length; i += chunkSize) {
    chunks.push(accountIds.slice(i, i + chunkSize));
  }

  console.log(`Syncing ${accountIds.length} accounts in ${chunks.length} batches`);

  const results = [];
  for (const chunk of chunks) {
    console.log(`Processing batch of ${chunk.length} accounts...`);
    
    const result = await client.getAccountsByIds(chunk);
    results.push(result);
    
    // Esperar 1 segundo entre batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const totalSynced = results.reduce((sum, r) => 
    sum + (r.accounts?.length || 0), 0
  );

  console.log(`Synced ${totalSynced} accounts successfully`);
  return results;
}

// Uso
const accountIds = ['WALLET001', 'WALLET002', /* ... más IDs ... */];
await syncMultipleAccounts(accountIds);
\`\`\`

### Ejemplo 3: Obtener Transacciones del Mes

\`\`\`typescript
import { LemonwayClient } from '@/lib/lemonway-client';

async function getMonthlyTransactions(walletId: string, year: number, month: number) {
  const config = await LemonwayClient.getConfig();
  const client = new LemonwayClient(config);

  // Calcular primer y último día del mes
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`Getting transactions from ${startDateStr} to ${endDateStr}`);

  const result = await client.getTransactions(walletId, startDateStr, endDateStr);

  // Procesar transacciones
  const transactions = result.transactions || [];
  
  const summary = {
    total: transactions.length,
    totalInflow: 0,
    totalOutflow: 0,
    byType: {} as Record<string, number>
  };

  transactions.forEach((txn: any) => {
    const amountEur = txn.amount / 100;
    
    // Contar por tipo
    summary.byType[txn.type] = (summary.byType[txn.type] || 0) + 1;
    
    // Calcular flujo
    if (txn.type === 'money_in') {
      summary.totalInflow += amountEur;
    } else if (txn.type === 'money_out') {
      summary.totalOutflow += amountEur;
    }
  });

  return {
    transactions,
    summary
  };
}

// Uso
const result = await getMonthlyTransactions('WALLET123', 2024, 1);
console.log('Summary:', result.summary);
console.log('Transactions:', result.transactions);
\`\`\`

### Ejemplo 4: Verificar Estado KYC

\`\`\`typescript
import { LemonwayClient } from '@/lib/lemonway-client';

async function checkKycCompliance(accountIds: string[]) {
  const config = await LemonwayClient.getConfig();
  const client = new LemonwayClient(config);

  const results = [];

  for (const accountId of accountIds) {
    const account = await client.getAccountDetails(accountId);
    
    if (account.accounts && account.accounts.length > 0) {
      const acc = account.accounts[0];
      
      results.push({
        accountId: acc.id,
        email: acc.email,
        kycStatus: acc.kycStatus,
        isCompliant: acc.kycStatus === 1, // 1 = VALIDATED
        canTransact: acc.status === 5 && acc.kycStatus === 1
      });
    }
  }

  return results;
}

// Uso
const compliance = await checkKycCompliance(['WALLET123', 'WALLET456']);

compliance.forEach(acc => {
  console.log(`${acc.accountId}: ${acc.isCompliant ? '✅ Compliant' : '❌ Not Compliant'}`);
});
\`\`\`

---

## Troubleshooting

### Problema 1: Error 403 Forbidden

**Síntoma**:
\`\`\`
Error: fetch to https://sandbox-api.lemonway.fr/.../accounts/retrieve failed with status 403
\`\`\`

**Causa**: La IP del servidor no está en la whitelist de Lemonway.

**Solución**:
1. Obtener la IP de salida del servidor:
   \`\`\`bash
   curl https://api.ipify.org
   \`\`\`

2. Ir al dashboard de Lemonway
3. Configuración → Seguridad → IP Whitelist
4. Añadir la IP obtenida
5. Esperar 5-10 minutos para propagación

### Problema 2: Error 429 Too Many Requests

**Síntoma**:
\`\`\`
Error: Rate limit exceeded - Too Many Requests
\`\`\`

**Causa**: Demasiadas peticiones en corto tiempo.

**Solución**:
1. Verificar configuración de rate limiting:
   \`\`\`sql
   SELECT max_concurrent_requests, min_delay_between_requests_ms
   FROM "LemonwayConfig" ORDER BY id DESC LIMIT 1;
   \`\`\`

2. Ajustar parámetros:
   \`\`\`sql
   UPDATE "LemonwayConfig"
   SET 
     max_concurrent_requests = 2,
     min_delay_between_requests_ms = 2000
   WHERE id = (SELECT id FROM "LemonwayConfig" ORDER BY id DESC LIMIT 1);
   \`\`\`

3. Reiniciar aplicación para aplicar cambios

### Problema 3: Token Inválido

**Síntoma**:
\`\`\`
Error: OAuth failed: 401 - Invalid credentials
\`\`\`

**Causa**: API Token incorrecto o mal formateado.

**Solución**:
1. Verificar token en base de datos:
   \`\`\`sql
   SELECT api_token FROM "LemonwayConfig" ORDER BY id DESC LIMIT 1;
   \`\`\`

2. El token debe ser base64 de `{client_id}:{client_secret}`
   \`\`\`bash
   echo -n "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" | base64
   \`\`\`

3. Actualizar token:
   \`\`\`sql
   UPDATE "LemonwayConfig"
   SET api_token = 'NEW_BASE64_TOKEN'
   WHERE id = (SELECT id FROM "LemonwayConfig" ORDER BY id DESC LIMIT 1);
   \`\`\`

### Problema 4: Sincronización No Funciona

**Síntoma**: Los datos no aparecen en `payment_accounts`.

**Diagnóstico**:
1. Verificar logs de sincronización:
   \`\`\`sql
   SELECT 
     endpoint,
     success,
     error_message,
     response_payload
   FROM "LemonwayApiCallLog"
   WHERE endpoint LIKE '%accounts/retrieve%'
   ORDER BY created_at DESC
   LIMIT 5;
   \`\`\`

2. Verificar que `response_payload` contiene `accounts[]`

3. Revisar logs del servidor:
   \`\`\`bash
   grep "syncAccountFromResponse" /var/log/app.log
   \`\`\`

**Soluciones**:
- Si `responsePayload.accounts` es null → API no devolvió datos
- Si hay error de parsing → Formato de respuesta cambió
- Si hay error de SQL → Verificar schema de `payment_accounts`

### Problema 5: Método Deshabilitado

**Síntoma**:
\`\`\`
Error: El método getAccountDetails está desactivado
\`\`\`

**Causa**: El método fue deshabilitado en el API Explorer.

**Solución**:
1. Ir a `/dashboard/lemonway-api-explorer`
2. Buscar el método deshabilitado
3. Click en el toggle para habilitarlo

O vía SQL:
\`\`\`sql
UPDATE lemonway_api_methods
SET is_enabled = true
WHERE name = 'getAccountDetails';
\`\`\`

---

## Apéndice

### A. Estructura de Respuestas de Lemonway

#### Account Object

\`\`\`typescript
interface LemonwayAccount {
  id: string;                    // Wallet ID
  email: string;
  firstname: string;
  lastname: string;
  balance: number;               // En centavos
  status: number;                // Ver tabla de estados
  kycStatus: number;             // 0=None, 1=Valid, 2=Refused
  accountType: number;           // 1=Individual, 2=Company
  phoneNumber: string;
  mobileNumber: string;
  adresse: {
    street: string;
    city: string;
    postCode: string;
    country: string;             // Código ISO (FR, ES, etc.)
  };
  birth: {
    date: string;                // Formato: DD/MM/YYYY
    city: string;
    Country: string;
  };
  company?: {
    name: string;
    description: string;
    websiteUrl: string;
    identificationNumber: string;
  };
  internalId: string;
  isblocked: boolean;
  isDebtor: boolean;
  nationality: string;
  payerOrBeneficiary: number;
}
\`\`\`

#### Transaction Object

\`\`\`typescript
interface LemonwayTransaction {
  id: string;                    // Transaction ID
  date: string;                  // ISO 8601
  type: 'money_in' | 'money_out' | 'p2p' | 'split';
  amount: number;                // En centavos
  currency: string;              // EUR, USD, etc.
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  debitWallet: string | null;
  creditWallet: string | null;
  comment: string;
  metadata: Record<string, any>;
}
\`\`\`

### B. Estados de Cuenta

| Código | Estado | Descripción |
|--------|--------|-------------|
| 0 | Unregistered | No registrada |
| 1 | Registered | Registrada (pendiente documentos) |
| 2 | One-ID | Un documento validado |
| 3 | Two-ID | Dos documentos validados |
| 4 | One-ID-Company | Empresa con un documento |
| 5 | Active | Activa y operativa |
| 6 | Blocked | Bloqueada |
| 7 | Closed | Cerrada |

### C. Límites de API

| Recurso | Límite | Periodo |
|---------|--------|---------|
| Requests totales | 1000 | Por hora |
| Requests por método | 100 | Por minuto |
| Concurrent requests | 10 | Simultáneas |
| Payload size | 1 MB | Por request |
| Accounts per batch | 50 | Recomendado |

### D. Webhooks (Futuro)

Lemonway puede enviar webhooks para eventos como:

- Nuevo ingreso de dinero
- KYC aprobado/rechazado
- Transacción completada
- Cambio de estado de cuenta

**URL de webhook**: Configurar en Lemonway dashboard  
**Validación**: Usar `webhook_secret` de `LemonwayConfig`

---

## Soporte y Contacto

### Recursos Oficiales

- **Documentación**: https://documentation.lemonway.com/
- **Dashboard Sandbox**: https://sandbox-webapp.lemonway.fr/
- **Dashboard Production**: https://webapp.lemonway.fr/
- **Soporte**: support@lemonway.com

### Recursos Internos

- **API Explorer**: `/dashboard/lemonway-api-explorer`
- **Configuración**: `/dashboard/lemonway-config`
- **Transacciones**: `/dashboard/lemonway-transactions`
- **Logs**: Base de datos tabla `LemonwayApiCallLog`

---

**Versión del Documento**: 1.0  
**Última Actualización**: 2024  
**Autor**: Sistema URBIX
