# Integración Lemonway - Documentación Técnica Completa

## 1. VISIÓN GENERAL

### 1.1 Propósito

Lemonway es el proveedor de pagos europeo integrado en URBIX que proporciona:
- **Wallets electrónicas** para inversores y plataforma
- **Procesamiento de transacciones** (money-in, money-out, transferencias P2P)
- **Verificación KYC/AML** automática
- **Webhooks en tiempo real** para eventos de transacciones
- **APIs REST** para sincronización de datos

### 1.2 Modelo de Negocio

\`\`\`
INVERSOR                          LEMONWAY                       URBIX PLATFORM
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│   Wallet     │ ◄────────────│   Backend    │──────────────► Virtual Acct  │
│   (Lemonway) │              │   (OAuth)    │              │   (URBIX)    │
└──────────────┘              └──────────────┘              └──────────────┘
     │                              │                            │
     │ Ingresos/Egresos             │ Webhooks/Transacciones     │
     │ KYC/Documentos               │ Sincronización             │ Movimientos
     │ Balance                      │ Eventos                    │ Auditoría
     │                              │                            │
\`\`\`

---

## 2. ARQUITECTURA TÉCNICA

### 2.1 Capas de Integración

#### **Capa 1: Autenticación (OAuth 2.0)**

**Flujo:**
\`\`\`
1. Request Token
   POST /oauth/api/v1/oauth/token
   Authorization: Basic (base64(client_id:client_secret))
   
2. Response: Bearer Token (válido 90 días)
   {
     "access_token": "eyJ...",
     "token_type": "Bearer",
     "expires_in": 7776000
   }

3. Token guardado en: public.LemonwayConfig.api_token
4. Reutilizado hasta su expiración
\`\`\`

**Archivos clave:**
- `lib/lemonway-client.ts` (líneas 1-100): Gestión de OAuth
- `public.LemonwayConfig`: Tabla de configuración

#### **Capa 2: Client HTTP con Rate Limiting**

**Sistema de Cola Inteligente:**

\`\`\`typescript
// Cola de peticiones con control de concurrencia
LemonwayClient {
  maxConcurrentRequests: 3
  minDelayBetweenRequestsMs: 1000
  requestQueue: PriorityQueue
  activeRequests: Map<id, Promise>
}
\`\`\`

**Algoritmo de procesamiento:**
1. Verifica slots disponibles (< 3 activas)
2. Si no hay slots: espera en cola
3. Respeta delay mínimo entre peticiones
4. Maneja race conditions

**Archivos clave:**
- `lib/lemonway-client.ts` (líneas 100-250): Implementación de cola

#### **Capa 3: Reintentos Automáticos**

**Tabla: `LemonwayApiCallLog`**

\`\`\`
Estado del Reintento:
┌─────────────────────────────────────┐
│         Initial Request             │
│  (GET /accounts/retrieve)            │
└────────────┬────────────────────────┘
             │
             ├─ Success (200) ──► Fin
             │
             └─ Fail (5xx, timeout)
                │
                ├─ Intento 1: +1s ──► Fail
                │
                ├─ Intento 2: +2s ──► Fail
                │
                ├─ Intento 3: +4s ──► Success ─────► Fin
                │
                └─ Intento 4: +8s ──► Fail ──► max_retries
                                    │
                                    └─► manual_retry_needed = true
\`\`\`

**Configuración:**
\`\`\`json
{
  "maxRetryAttempts": 3,
  "retryDelaySeconds": [1, 2, 4, 8, 16, 32],
  "manualRetryEnabled": true,
  "retryableStatuses": [408, 429, 500, 502, 503, 504],
  "nonRetryableStatuses": [400, 401, 403, 404]
}
\`\`\`

**Archivos clave:**
- `lib/lemonway-client.ts` (líneas 250-400): Implementación de reintentos
- `public.LemonwayApiCallRetryHistory`: Historial detallado

---

## 3. ENDPOINTS PRINCIPALES

### 3.1 Obtener Cuentas (Retrieve Accounts)

**Endpoint:** `POST /accounts/retrieve`

**Propósito:** Obtener detalles completos de cuentas con KYC status

**Request:**
\`\`\`json
{
  "updateDate": "2024-01-01T00:00:00Z",
  "page": 1,
  "limit": 50
}
\`\`\`

**Response:**
\`\`\`json
{
  "accounts": [
    {
      "id": "154",
      "email": "investor@example.com",
      "firstname": "John",
      "lastname": "Doe",
      "balance": 530000,
      "status": 6,
      "kycStatus": 1,
      "kycLevel": 2,
      "isblocked": false,
      "address": {
        "street": "Calle Principal 123",
        "city": "Madrid",
        "postCode": "28001",
        "country": "ESP"
      },
      "company": {
        "name": "Acme Corp",
        "identificationNumber": "CIF123456"
      },
      "raw_data": {...}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250
  }
}
\`\`\`

**Status Codes de Lemonway:**
- `1-3`: KYC Incompleto
- `5`: REGISTERED
- `6`: ACTIVE
- `8`: CLOSED
- `12`: REJECTED

**KYC Status:**
- `0`: Sin verificación
- `1`: Validado
- `2`: Rechazado

**Implementación:**
\`\`\`typescript
// lib/lemonway-client.ts líneas 330-380
const accounts = await client.getAccounts({
  updateDate: "2024-01-01",
  page: 1,
  limit: 50
})
// Automáticamente:
// 1. Sincroniza a payments.payment_accounts
// 2. Mapea todos los campos
// 3. Guarda raw_data completo en JSONB
\`\`\`

### 3.2 KYC Status

**Endpoint:** `GET /accounts/kycstatus`

**Propósito:** Obtener estado KYC de múltiples cuentas

**Response:**
\`\`\`json
{
  "accounts": [
    {
      "id": "154",
      "kycStatus": 1,
      "documents": [
        {
          "id": "doc123",
          "type": "IDENTITY",
          "status": "ACCEPTED"
        }
      ]
    }
  ]
}
\`\`\`

### 3.3 Transacciones

**Endpoint:** `GET /accounts/{accountId}/transactions/`

**Propósito:** Importar transacciones de una wallet

**Parameters:**
\`\`\`
startDate: Unix timestamp
endDate: Unix timestamp
importRunId: ID de la importación (interno)
\`\`\`

**Response:**
\`\`\`json
{
  "transactionIn": [
    {
      "id": "tx123456",
      "debitWalletId": "154",
      "creditWalletId": "155",
      "debitAmount": 100000,
      "creditAmount": 99000,
      "transactionDate": 1704067200,
      "status": "SUCCESS",
      "type": "CREDIT",
      "subtype": "TRANSFER",
      "message": "Transferencia P2P",
      "label": "Inversión proyecto X",
      "currency": "EUR",
      "card": null,
      "PSP": {
        "name": "Stripe",
        "transactionId": "ch_123"
      }
    }
  ]
}
\`\`\`

---

## 4. WEBHOOKS EN TIEMPO REAL

### 4.1 Arquitectura de Webhooks

**Flujo:**

\`\`\`
Lemonway                    URBIX Backend                   Procesamiento
┌──────────────┐            ┌──────────────┐               ┌──────────────┐
│  Evento      │──POST──────│  /webhooks/  │──ENQUEUE──────│   Worker     │
│  (Wallet)    │            │  lemonway    │               │   (async)    │
└──────────────┘            └──────────────┘               └──────────────┘
                                  │
                                  ├─ Validar firma
                                  ├─ Parse JSON
                                  ├─ Insert en WebhookDelivery
                                  ├─ Return 200 immediately
                                  │
                                  └─ Fire-and-forget ──────► Procesamiento
\`\`\`

**Endpoint:** `POST /api/webhooks/lemonway`

**Implementación:**
- `app/api/webhooks/lemonway/route.ts` (líneas 1-124): Receptor
- `lib/lemonway-webhook/processor.ts` (líneas 1-103): Procesador
- `lib/lemonway-webhook/handlers.ts` (líneas 1-292): Handlers por tipo evento

### 4.2 Tipos de Eventos (NotifCategory)

| Código | Evento | Descripción |
|--------|--------|-------------|
| 8 | WALLET_STATUS_CHANGE | Estado de wallet cambió |
| 9 | DOCUMENT_STATUS_CHANGE | Estado de documento KYC |
| 10 | MONEY_IN_WIRE | Ingreso por transferencia |
| 11 | MONEY_IN_SDD | Ingreso por domiciliación |
| 12 | MONEY_IN_CHEQUE | Ingreso por cheque |
| 13 | BLOCKED_ACCOUNT | Cuenta bloqueada/desbloqueada |
| 14 | CHARGEBACK | Contracargo |
| 15 | MONEY_OUT_STATUS | Estado de retiro |
| 17 | MONEY_IN_SDD_CANCELED | Domiciliación cancelada |
| 22 | MONEY_IN_CARD_SUB | Ingreso por tarjeta (suscripción) |
| 45 | MONEY_IN_CHEQUE_CANCELED | Cheque cancelado |
| 48 | MONEY_IN_SOFORT | Ingreso por SOFORT |

### 4.3 Flujo de Procesamiento de Webhook

\`\`\`
1. RECEIVED
   ├─ Webhook llega a POST /api/webhooks/lemonway
   ├─ Extrae headers raw
   ├─ Parse JSON payload
   ├─ Determina NotifCategory
   └─ Insert en WebhookDelivery (status: RECEIVED)

2. FIRE-AND-FORGET
   └─ Call processWebhookDelivery() (no await)

3. PROCESSING (async)
   ├─ Update status = PROCESSING
   ├─ Busca handler según NotifCategory
   ├─ Ejecuta handler(payload, delivery)
   └─ Handler actualiza datos según evento

4. PROCESSED/FAILED
   ├─ Success: status = PROCESSED
   ├─ Fail: status = FAILED, retry_count++
   └─ Almacena error_message
\`\`\`

### 4.4 Ejemplo: Manejo de WALLET_STATUS_CHANGE

\`\`\`typescript
// lib/lemonway-webhook/handlers.ts líneas 49-97

export async function handleWalletStatusChange(
  payload: LemonwayWebhookPayload,
  delivery: WebhookDelivery
): Promise<HandlerResult> {
  const { ExtId, Status, Blocked } = payload
  
  // Mapeo de status Lemonway → URBIX
  const statusMap = {
    6: "ACTIVE",
    8: "CLOSED",
    12: "REJECTED"
  }
  
  // Update en BD
  await sql`
    UPDATE integrations."PaymentAccount"
    SET 
      lw_status = ${Status},
      status = ${Blocked ? "BLOCKED" : statusMap[Status]},
      updated_at = NOW()
    WHERE external_id = ${ExtId}
  `
  
  return { success: true, message: "..." }
}
\`\`\`

---

## 5. FLUJO DE IMPORTACIÓN DE MOVIMIENTOS

### 5.1 Arquitectura General

\`\`\`
Admin inicia import                 Lemonway Import System
┌──────────────────┐               ┌──────────────────┐
│ Dashboard        │               │ Cron Job         │
│ import-start     │──(1)──────────│ (cada 5 min)     │
│                  │               │                  │
│                  │               │ Procesa pending  │
│                  │               │ imports          │
│                  │               │                  │
│                  │◄──(8)─────────│ Update status    │
│                  │ movimientos   │ a "completed"    │
└──────────────────┘               └──────────────────┘
                                            │
                                            ├─(2)─► Encola en LemonwayApiCallLog
                                            ├─(3)─► Ejecuta GET /accounts/{id}/transactions
                                            ├─(4)─► Recibe transacciones
                                            ├─(5)─► Mapea tipos operación
                                            ├─(6)─► Insert en lemonway_temp.movimientos_cuenta
                                            └─(7)─► Update import_runs (completed)
\`\`\`

### 5.2 Estados del Import Run

\`\`\`
pending ──► processing ──► completed
   │            │              │
   │            └─► failed      │
   │                            │
   └──────────► partial ◄───────┘
   (algunos éxito, algunos fracaso)
\`\`\`

### 5.3 Tablas Involucradas

#### **lemonway_temp.import_runs**

\`\`\`sql
CREATE TABLE lemonway_temp.import_runs (
  id TEXT PRIMARY KEY,
  status TEXT (pending|processing|completed|failed|partial),
  
  -- Parámetros
  account_id TEXT,
  cuenta_virtual_id TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  
  -- Resultados
  total_transactions INTEGER,
  imported_transactions INTEGER,
  failed_transactions INTEGER,
  
  -- Metadata
  lemonway_api_call_log_id TEXT,
  error_message TEXT,
  
  created_by TEXT,
  created_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
)
\`\`\`

#### **lemonway_temp.movimientos_cuenta**

\`\`\`sql
CREATE TABLE lemonway_temp.movimientos_cuenta (
  id TEXT PRIMARY KEY,
  
  -- Relaciones
  import_run_id TEXT REFERENCES import_runs,
  cuenta_virtual_id TEXT,
  tipo_operacion_id TEXT,
  
  -- Datos Lemonway
  lemonway_transaction_id TEXT UNIQUE,
  lemonway_raw_data JSONB,
  
  -- Campos principales
  fecha_operacion TIMESTAMP,
  monto DECIMAL(15,2),
  tipo_transaccion TEXT (CREDIT|DEBIT),
  descripcion TEXT,
  
  -- Saldos
  saldo_previo DECIMAL(15,2),
  saldo_posterior DECIMAL(15,2),
  
  -- Estado
  procesado BOOLEAN,
  estado_importacion TEXT,
  
  created_at TIMESTAMP
)
\`\`\`

### 5.4 Flujo Paso a Paso

**Fase 1: Iniciar Import (Admin)**

\`\`\`typescript
// POST /api/lemonway/imports/start
{
  "cuenta_virtual_id": "uuid-...",
  "fecha_inicio": "2024-01-01",
  "fecha_fin": "2024-01-31"
}

// Sistema:
// 1. Crea registro en import_runs (status: pending)
// 2. Retorna importRunId
\`\`\`

**Fase 2: Procesar Pending (Cron cada 5 min)**

\`\`\`typescript
// POST /api/cron/process-lemonway-imports

// Flujo:
// 1. Busca import_runs con status = "pending" (máx 10)
// 2. Para cada run:
//    - Update status = "processing"
//    - Llama LemonwayImportWorker.processImportRun(runId)
//    - Worker encola en LemonwayApiCallLog
//    - Retorna control inmediatamente
\`\`\`

**Fase 3: Ejecutar Llamada API**

\`\`\`typescript
// LemonwayApiCallLog: retry_status = "pending"
// => Cron procesa cola cada 30s
// => Llama GET /accounts/{accountId}/transactions/
// => Parámetros:
//    startDate: 1704067200 (timestamp)
//    endDate: 1706745600
//    importRunId: "uuid-..."

// Respuesta Lemonway:
{
  "transactionIn": [
    { id: "tx123", amount: 100000, ... },
    { id: "tx124", amount: 50000, ... },
    ...
  ]
}
\`\`\`

**Fase 4: Mapear e Insertar**

\`\`\`typescript
// Para cada transacción:
// 1. Mapea tipo_operacion (CREDIT_IN, DEBIT_OUT, etc.)
// 2. Mapea cuenta_virtual_id desde Lemonway account_id
// 3. Calcula montos en euros (divide por 100 si centavos)
// 4. Insert en movimientos_cuenta:
//    - estado_importacion: "imported"
//    - procesado: false
//    - lemonway_raw_data: JSON completo

// 5. Update import_runs:
//    - status: "completed"
//    - imported_transactions: 2
//    - completed_at: NOW()
\`\`\`

**Fase 5: Revisar y Aprobar (Admin)**

\`\`\`
Dashboard /dashboard/lemonway/temp-movimientos
├─ Ver lista de importaciones por revisar
├─ Filtrar por import_run, estado, fecha
├─ Por cada movimiento:
│  ├─ Verificar datos
│  ├─ Cambiar estado: APPROVED/REJECTED
│  └─ Opcional: añadir nota
└─ Update estado_revision = "approved"
\`\`\`

**Fase 6: Aplicar Movimientos (Cron cada 10 min)**

\`\`\`typescript
// POST /api/cron/process-approved-movements

// Flujo:
// 1. Busca movimientos con estado_revision = "approved"
// 2. Para cada movimiento:
//    - Obtiene cuenta_virtual_id
//    - Calcula nuevo saldo_disponible
//    - Insert en virtual_accounts.movimientos_cuenta
//    - Update balance en cuentas_virtuales
//    - Mark como procesado: true
//    - Trigger: movement.approved ─► notificación inversor
\`\`\`

---

## 6. SINCRONIZACIÓN DE DATOS

### 6.1 Mapeador de Campos

**Tabla de Mapeo (lemonway_raw ─► URBIX BD):**

| Campo Lemonway | Tabla URBIX | Transformación |
|---|---|---|
| `id` | `payments.payment_accounts.id` | Directo |
| `email` | `email` | Directo |
| `firstname` | `firstname` | Directo |
| `lastname` | `lastname` | Directo |
| `balance` | `balance` | `/100` (centavos → euros) |
| `status` | `status` | Mapeo: 6→ACTIVE, 8→CLOSED |
| `kycStatus` | `kyc_status` | 0=NONE, 1=PENDING, 2=VALIDATED |
| `isblocked` | `is_blocked` | Directo |
| `adresse.country` | `country` | ISO 3-letra (ESP, FRA) |
| `birth.date` | `birth_date` | DD/MM/YYYY ─► YYYY-MM-DD |
| *(todo)* | `raw_data` | JSON.stringify() |

**Implementación:**
\`\`\`typescript
// lib/lemonway-client.ts líneas 500-580

// Después de GET /accounts/retrieve
const account = response.accounts[0]

await sql`
  INSERT INTO payments.payment_accounts (
    id, email, firstname, lastname, 
    balance, status, kyc_status, is_blocked,
    country, birth_date, raw_data, last_sync_at
  ) VALUES (
    ${account.id},
    ${account.email},
    ${account.firstname},
    ${account.lastname},
    ${account.balance / 100},  -- Conversión centavos → euros
    ${statusMap[account.status]},
    ${kycStatusMap[account.kycStatus]},
    ${account.isblocked},
    ${account.adresse.country},
    ${parseBirthDate(account.birth.date)},
    ${JSON.stringify(account)}::jsonb,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    balance = EXCLUDED.balance,
    status = EXCLUDED.status,
    kyc_status = EXCLUDED.kyc_status,
    raw_data = EXCLUDED.raw_data,
    last_sync_at = NOW()
`
\`\`\`

### 6.2 Triggers de Sincronización

**Automáticas:**
- Después de cada `getAccounts()` exitoso ─► Sync a `payment_accounts`
- Después de cada webhook de WALLET_STATUS_CHANGE ─► Update status
- Después de cada webhook de MONEY_IN ─► Create movimiento

---

## 7. MANEJO DE ERRORES Y REINTENTOS

### 7.1 Estados de Reintento

\`\`\`
┌─ Éxito (200) ──────────────► retry_status = "none"
│
Initial Request
│
└─ Error
   ├─ 408 (Timeout) ──────────► REINTENTABLE
   ├─ 429 (Rate Limit) ───────► REINTENTABLE (esperar)
   ├─ 5xx (Server Error) ─────► REINTENTABLE
   │
   ├─ Intento 1 (+1s)
   │  └─ Fail ──────► retry_count = 1, next_retry_at = now + 2s
   │
   ├─ Intento 2 (+2s)
   │  └─ Fail ──────► retry_count = 2, next_retry_at = now + 4s
   │
   ├─ Intento 3 (+4s)
   │  └─ Fail ──────► retry_count = 3, next_retry_at = now + 8s
   │
   └─ max_retries (3) alcanzado
      └─ final_failure = true
      └─ manual_retry_needed = true
      └─ retry_status = "failed"
\`\`\`

### 7.2 Estados No-Retentable

\`\`\`
├─ 400 (Bad Request) ────► ERROR en lógica (NO reintentar)
├─ 401 (Unauthorized) ──► ERROR en token (NO reintentar)
├─ 403 (Forbidden) ─────► ERROR en permisos (NO reintentar)
└─ 404 (Not Found) ─────► ERROR en endpoint (NO reintentar)
\`\`\`

### 7.3 Tabla de Histórico de Reintentos

\`\`\`
LemonwayApiCallRetryHistory

Para cada reintento:
├─ api_call_log_id: FK a la llamada original
├─ attempt_number: 0 (inicial), 1, 2, 3, ...
├─ response_status: 500, 503, 200, etc.
├─ success: true/false
├─ duration_ms: 523
├─ error_message: "Connection timeout"
├─ response_payload: {...}
└─ created_at: timestamp del intento
\`\`\`

---

## 8. SISTEMA DE COLAS Y RATE LIMITING

### 8.1 Configuración

\`\`\`sql
SELECT * FROM LemonwayConfig
-- Campos:
-- - max_concurrent_requests: 3 (máx 3 solicitudes paralelas)
-- - min_delay_between_requests_ms: 1000 (esperar 1s entre requests)
\`\`\`

### 8.2 Algoritmo de Cola

\`\`\`typescript
class LemonwayClient {
  private maxConcurrent = 3
  private minDelay = 1000  // ms
  private activeRequests = 0
  private requestQueue = []
  private lastRequestTime = 0
  
  async executeRequest(endpoint, params) {
    // 1. Esperar si hay slots disponibles
    while (this.activeRequests >= this.maxConcurrent) {
      await sleep(100)
    }
    
    // 2. Esperar delay mínimo
    const timeSinceLastRequest = Date.now() - this.lastRequestTime
    if (timeSinceLastRequest < this.minDelay) {
      await sleep(this.minDelay - timeSinceLastRequest)
    }
    
    // 3. Ejecutar request
    this.activeRequests++
    this.lastRequestTime = Date.now()
    
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        ...
      })
      return response
    } finally {
      this.activeRequests--
    }
  }
}
\`\`\`

### 8.3 Estadísticas de Cola

**Endpoint:** `GET /api/lemonway/queue-stats`

\`\`\`json
{
  "queue_length": 12,
  "active_requests": 2,
  "pending_requests": 10,
  "avg_wait_time_ms": 5234,
  "total_processed_today": 1523,
  "failed_today": 3,
  "retry_attempts_today": 47,
  "last_request": "2024-01-15T14:32:10Z"
}
\`\`\`

---

## 9. PROCESOS DE NEGOCIO INTEGRADOS

### 9.1 Flujo Completo: Inversor Realiza Inversión

\`\`\`
INVERSOR                    URBIX                       LEMONWAY
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│ 1. Register  │────────────│ Create User  │────Auth────│ Create Account│
│              │            │ (investor)   │            │ (Wallet)     │
└──────────────┘            └──────────────┘            └──────────────┘
                                   │
                                   ├─ 2. Solicita Inversión
                                   │    POST /api/inversiones
                                   │
                                   ├─ 3. Create investment record
                                   │    (status: PENDIENTE)
                                   │
                                   ├─ 4. Solicita Documentos
                                   │    (contrato digital)
                                   │
                                   ├─ 5. Inversor Firma
                                   │    POST /sign OTP SMS
                                   │
                                   ├─ 6. Firma Completada
                                   │    Update investment status
                                   │
                                   ├─ 7. Solicita Pago
                                   │    POST /api/payment/create
                                   │
    ┌──────────────────────────────┼──────────────────────────────┐
    │                              │                              │
    ├─ 8. Money-In por             ├─ 9. Webhook                 ├─ Transferencia
    │    transferencia bancaria    │    MONEY_IN_WIRE             │ enviada
    │    EUR 1,000                 │                              │
    │                              ├─ 10. Handler: Create        ├─ Lemonway
    │                              │      movimiento_cuenta       │ Wallet actualizado
    │                              │                              │
    │                              ├─ 11. Cron: Import           ├─ Disponible en
    │                              │      GET /transactions/     │  Lemonway
    │                              │                              │
    │                              ├─ 12. Insert en              
    │                              │      lemonway_temp
    │                              │
    │                              ├─ 13. Admin Revisa
    │                              │      Aprueba movimiento
    │                              │
    │                              ├─ 14. Cron: Aplicar
    │                              │      Insert virtual_accounts
    │                              │      movimientos_cuenta
    │                              │
    │                              └─► 15. Inversor ve
    │                                  saldo disponible
    │                                  EUR 1,000
    │
    └──────────────────────────────────────────────────────────┘
\`\`\`

### 9.2 Flujo: Retiro de Fondos (Money-Out)

\`\`\`
URBIX                       LEMONWAY                    BANCO
┌──────────────┐            ┌──────────────┐            ┌──────────────┐
│ 1. Inversor  │────────────│ Create       │────────────│ Initiate     │
│    solicita  │ POST /      │ money-out    │────────────│ Wire Transfer│
│    retiro    │ money-out  │ request      │            │              │
│              │            │              │            └──────────────┘
└──────────────┘            └──────────────┘                    │
       │                           │                            │
       ├─ 2. Update balance        ├─ 3. Webhook:              ├─ 4. Transfer
       │    (bloqueado)            │    MONEY_OUT_PENDING      │    en proceso
       │                           │                            │
       ├─ 3. Crea tarea            ├─ 5. Webhook:              ├─ 5. Transfer
       │    VERIFICACION_RETIRO    │    MONEY_OUT_SUCCESS      │    completado
       │                           │                            │
       ├─ 4. Admin revisa y        └───────────────────────────┴──► Fondos en
       │    aprueba retiro             6. Handler: Retiro completado  banco del
       │                               Update movimiento_cuenta        inversor
       └─────────────────────────────────────────────────────────►
\`\`\`

---

## 10. MONITORING Y OBSERVABILIDAD

### 10.1 Métricas Principales

**En tiempo real:**
- `queue_length`: Solicitudes en cola
- `active_requests`: Requests en procesamiento
- `failed_requests_24h`: Fallos en últimas 24h
- `avg_retry_attempts`: Promedio de reintentos

**Histórico:**
- `LemonwayApiCallLog`: Todas las llamadas API
- `LemonwayApiCallRetryHistory`: Historial de reintentos
- `lemonway_webhooks.WebhookDelivery`: Todos los webhooks

### 10.2 Dashboards

**Admin Panels:**
- `/dashboard/lemonway-webhooks`: Monitor de webhooks
- `/dashboard/lemonway/imports`: Historial de importaciones
- `/dashboard/lemonway/temp-movimientos`: Movimientos a revisar
- `/dashboard/lemonway-api-explorer`: Explorador de endpoints

### 10.3 Alertas Configurables

\`\`\`typescript
Alertas:
├─ Queue length > 100 ──────────► Contactar soporte
├─ Failed requests > 10/h ──────► Revisar errores API
├─ Webhook delivery failure ────► Reintentar manualmente
├─ Manual retry needed ─────────► Admin acción requerida
└─ KYC status cambios ──────────► Notificar inversor
\`\`\`

---

## 11. SEGURIDAD

### 11.1 Tokens OAuth

- **Válido por:** 90 días
- **Almacenado en:** `public.LemonwayConfig.api_token`
- **Rotación:** Automática cuando expira
- **Scope:** Acceso a todas las operaciones

### 11.2 Validación de Webhooks

\`\`\`typescript
// Validar firma (si Lemonway lo proporciona)
const signature = request.headers['x-lemonway-signature']
const computed = hmac('sha256', WEBHOOK_SECRET, bodyText)

if (signature !== computed) {
  return NextResponse.json(
    { error: 'Invalid signature' },
    { status: 403 }
  )
}
\`\`\`

### 11.3 Auditoría Completa

- **LemonwayApiCallLog:** Cada request/response guardado
- **LemonwayApiCallRetryHistory:** Todos los reintentos
- **WebhookDelivery:** Todos los webhooks + error messages
- **SQLLog:** Queries de sincronización

---

## 12. TROUBLESHOOTING

### 12.1 Problemas Comunes

| Problema | Causa | Solución |
|----------|-------|----------|
| "Rate limit exceeded" | Más de 3 solicitudes simultáneas | Esperar o aumentar delay |
| "Token expired" | OAuth token expiró (90+ días) | Sistema genera nuevo automáticamente |
| "Transaction not found" | Transacción en Lemonway no existe | Verificar lemonway_transaction_id |
| "Webhook not processed" | Handler fallo | Reintento manual desde admin |
| "Balance mismatch" | Desfase en sincronización | Ejecutar GET /accounts/retrieve |

### 12.2 Debugging

\`\`\`typescript
// Explorador de API
POST /api/lemonway/test-api
{
  "method_id": "getAccounts",
  "parameters": {
    "updateDate": "2024-01-01",
    "page": 1,
    "limit": 10
  }
}

// Ver historial
GET /api/lemonway/retry-history?limit=50&status=failed

// Estadísticas de cola
GET /api/lemonway/queue-stats

// Reintentar webhook manualmente
POST /api/admin/lemonway/webhooks/[id]/reprocess
\`\`\`

---

## 13. ARCHIVOS CLAVE

| Archivo | Propósito |
|---------|-----------|
| `lib/lemonway-client.ts` | Client core (OAuth, queue, requests) |
| `lib/lemonway-webhook/processor.ts` | Procesador de webhooks |
| `lib/lemonway-webhook/handlers.ts` | Handlers por tipo evento |
| `lib/workers/lemonway-import-worker.ts` | Worker de importación |
| `lib/types/lemonway-api.ts` | Types para API |
| `lib/types/lemonway-webhook.ts` | Types para webhooks |
| `app/api/webhooks/lemonway/route.ts` | Endpoint webhook |
| `app/api/lemonway/movimientos/route.ts` | API de movimientos |
| `scripts/139-create-lemonway-import-schema.sql` | Schema DB |
| `docs/LEMONWAY-API-REFERENCE.md` | Referencia API |
| `docs/LEMONWAY-IMPORTS-SYSTEM.md` | Sistema importación |
| `docs/LEMONWAY-FIELD-MAPPING.md` | Mapeo de campos |

---

## 14. REFERENCIAS Y DOCUMENTACIÓN

- **Sitio oficial Lemonway:** https://lemonway.fr
- **API Docs (OAuth):** https://lemonway.fr/developer
- **Códigos de error:** Documentación interna
- **Webhook events:** Tabla de eventos arriba
- **Documentación URBIX:** `docs/ARQUITECTURA-COMPLETA-*.md`

---

**Documento v1.0 - Enero 2026**
**Última actualización: 2026-01-15**
