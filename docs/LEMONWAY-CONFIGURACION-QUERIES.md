# Lemonway: Configuración, Almacenamiento de Datos y Construcción de Queries

## 1. INTRODUCCIÓN

Este documento detalla DÓNDE se almacena toda la información necesaria para construir las queries a los endpoints de Lemonway, cómo se recupera, y cómo se construyen dinámicamente las solicitudes.

---

## 2. UBICACIÓN CENTRAL: BASE DE DATOS

### 2.1 Tabla Principal: `public."LemonwayConfig"`

**TODA la configuración de Lemonway se guarda en esta tabla única:**

\`\`\`sql
CREATE TABLE "LemonwayConfig" (
  id SERIAL PRIMARY KEY,
  environment VARCHAR(50), -- 'sandbox' | 'production'
  api_token VARCHAR(1000), -- OAuth token (Base64)
  wallet_id VARCHAR(255),
  environment_name VARCHAR(255), -- e.g., 'urbix'
  webhook_secret VARCHAR(255),
  company_name VARCHAR(255),
  company_website VARCHAR(255),
  max_concurrent_requests INT DEFAULT 3,
  min_delay_between_requests_ms INT DEFAULT 1000,
  account_id VARCHAR(255), -- Verificación de transacciones
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);
\`\`\`

**Ubicación en código:**
\`\`\`typescript
// lib/lemonway-client.ts líneas 51-90
static async getConfig(): Promise<LemonwayConfig | null> {
  const result = await sql`
    SELECT * FROM "LemonwayConfig" 
    ORDER BY "id" DESC 
    LIMIT 1
  `
  return {
    environment: config.environment, // "sandbox" o "production"
    apiToken: config.api_token, // Token OAuth en Base64
    environmentName: config.environment_name, // Nombre del ambiente
    walletId: config.wallet_id,
    webhookSecret: config.webhook_secret,
    companyName: config.company_name,
    companyWebsite: config.company_website,
    maxConcurrentRequests: config.max_concurrent_requests || 3,
    minDelayBetweenRequestsMs: config.min_delay_between_requests_ms || 1000,
    accountId: config.account_id
  }
}
\`\`\`

### 2.2 Tabla de Métodos Disponibles: `public."LemonwayApiMethod"`

Almacena la definición de TODOS los endpoints que Lemonway pone disponibles:

\`\`\`sql
CREATE TABLE "LemonwayApiMethod" (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255),
  endpoint VARCHAR(500), -- e.g., "/accounts/{id}/transactions"
  http_method VARCHAR(10), -- GET, POST, PUT, DELETE
  description TEXT,
  category VARCHAR(50), -- AUTH, ACCOUNTS, TRANSACTIONS, KYC, PAYMENTS
  is_enabled BOOLEAN DEFAULT true,
  request_schema JSONB, -- Schema JSON Schema de parámetros
  response_schema JSONB, -- Schema JSON Schema de respuesta
  example_request JSONB, -- Ejemplo de request
  example_response JSONB, -- Ejemplo de response
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
\`\`\`

**Ejemplo de registros:**
\`\`\`json
{
  "id": "GetWalletTransactions",
  "name": "Get Wallet Transactions",
  "endpoint": "/transactions/GetWalletTransactions",
  "http_method": "GET",
  "category": "TRANSACTIONS",
  "is_enabled": true,
  "request_schema": {
    "type": "object",
    "properties": {
      "startDate": {"type": "string", "format": "unix-timestamp"},
      "endDate": {"type": "string", "format": "unix-timestamp"}
    }
  },
  "response_schema": {
    "type": "object",
    "properties": {
      "transactionIn": {"type": "array"}
    }
  }
}
\`\`\`

### 2.3 Tabla de Logs de Llamadas API: `public."LemonwayApiCallLog"`

Almacena TODAS las llamadas realizadas a Lemonway para auditoría y reintentos:

\`\`\`sql
CREATE TABLE "LemonwayApiCallLog" (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(255),
  endpoint VARCHAR(500), -- /transactions/GetWalletTransactions
  method VARCHAR(10), -- GET, POST
  request_payload JSONB, -- Parámetros enviados
  response_payload JSONB, -- Respuesta recibida
  response_status INT, -- HTTP status code
  success BOOLEAN,
  error_message TEXT,
  duration_ms INT,
  sent_at TIMESTAMP,
  retry_count INT DEFAULT 0,
  retry_status VARCHAR(50), -- 'pending', 'success', 'failed'
  next_retry_at TIMESTAMP,
  manual_retry_needed BOOLEAN,
  final_failure BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

### 2.4 Tabla de Historial de Reintentos: `public."LemonwayApiCallRetryHistory"`

Almacena el historial de cada reintento:

\`\`\`sql
CREATE TABLE "LemonwayApiCallRetryHistory" (
  id SERIAL PRIMARY KEY,
  api_call_log_id INT REFERENCES "LemonwayApiCallLog"(id),
  attempt_number INT,
  response_status INT,
  success BOOLEAN,
  error_message TEXT,
  duration_ms INT,
  response_payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

### 2.5 Tabla de Métodos Deshabilitados: `public."LemonwayDisabledMethods"`

Control de qué métodos están disponibles o deshabilitados:

\`\`\`sql
CREATE TABLE "LemonwayDisabledMethods" (
  id SERIAL PRIMARY KEY,
  method_id VARCHAR(50),
  reason VARCHAR(255),
  disabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disabled_by VARCHAR(255),
  re_enable_at TIMESTAMP
);
\`\`\`

---

## 3. FLUJO DE RECUPERACIÓN DE CONFIGURACIÓN

### 3.1 Paso 1: Instanciar el Cliente

\`\`\`typescript
// app/api/lemonway/[endpoint]/route.ts
import { LemonwayClient } from '@/lib/lemonway-client'

// Obtener config de BD
const config = await LemonwayClient.getConfig()

// Si no hay config, lanzar error
if (!config) {
  throw new Error('Lemonway no está configurado')
}

// Instanciar cliente
const client = new LemonwayClient(config)
\`\`\`

### 3.2 Paso 2: Obtener Bearer Token (OAuth)

\`\`\`typescript
// lib/lemonway-client.ts líneas 105-160
async getBearerToken(): Promise<string> {
  // Si el token está en caché y no ha expirado, retornarlo
  if (this.bearerToken && this.tokenExpiresAt > new Date()) {
    return this.bearerToken
  }

  // OAuth URLs dinámicas según environment
  const oauthUrl = this.config.environment === "production"
    ? "https://api.lemonway.com/oauth/api/v1/oauth/token"
    : "https://sandbox-api.lemonway.fr/oauth/api/v1/oauth/token"

  // Headers con token API (Base64)
  const response = await fetch(oauthUrl, {
    method: "POST",
    headers: {
      Accept: "application/json;charset=UTF-8",
      Authorization: `Basic ${this.config.apiToken}`, // Token desde BD
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "Grant_type=client_credentials"
  })

  const data = await response.json()
  this.bearerToken = data.access_token // Cachear por 90 días

  return this.bearerToken
}
\`\`\`

### 3.3 Paso 3: Construir URL Base

\`\`\`typescript
// lib/lemonway-client.ts líneas 98-103
private getApiBaseUrl(): string {
  const envName = this.config.environmentName || "urbix"
  
  return this.config.environment === "production"
    ? `https://api.lemonway.fr/mb/${envName}/prod/directkitrest/v2`
    : `https://sandbox-api.lemonway.fr/mb/${envName}/dev/directkitrest/v2`
}

// Ejemplo resultado:
// Sandbox: https://sandbox-api.lemonway.fr/mb/urbix/dev/directkitrest/v2
// Production: https://api.lemonway.fr/mb/urbix/prod/directkitrest/v2
\`\`\`

---

## 4. CONSTRUCCIÓN DE QUERIES (REQUESTS)

### 4.1 Estructura General de Ejecución

\`\`\`typescript
// lib/lemonway-client.ts líneas 326-459
async executeAndUpdateLog(
  logId: number,
  endpoint: string, // "/transactions/GetWalletTransactions"
  method: "GET" | "POST" = "POST",
  data?: any // Parámetros de la query
): Promise<{ success, responseStatus, errorMessage }> {

  // 1. Obtener token
  const bearerToken = await this.getBearerToken()

  // 2. Construir URL completa
  const baseUrl = this.getApiBaseUrl()
  let url = `${baseUrl}${endpoint}` // Ej: .../v2/transactions/GetWalletTransactions

  // 3. Para GET, añadir parámetros en query string
  if (method === "GET" && data) {
    const params = new URLSearchParams()
    if (data.startDate) params.append("startDate", data.startDate)
    if (data.endDate) params.append("endDate", data.endDate)
    url = `${url}?${params.toString()}`
  }

  // 4. Construir headers
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "PSU-Accept-Language": "fr",
    "PSU-IP-Address": "1.1.1.1",
    "PSU-User-Agent": "Postman",
    Authorization: `Bearer ${bearerToken}`, // Token OAuth
    "User-Agent": "PostmanRuntime/7.51.0",
    "Postman-Token": this.generatePostmanToken(),
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive"
  }

  // 5. Ejecutar fetch
  const response = await fetch(url, {
    method,
    headers,
    body: method === "POST" && data ? JSON.stringify(data) : undefined
  })

  // 6. Procesar respuesta
  const responseStatus = response.status
  const responseText = await response.text()
  const responseData = JSON.parse(responseText)

  // 7. Actualizar log en BD
  await sql\`UPDATE "LemonwayApiCallLog" SET ...\`

  return { success, responseStatus, errorMessage }
}
\`\`\`

### 4.2 Ejemplo 1: GET Transacciones (Query con parámetros)

\`\`\`typescript
// app/api/lemonway/sync-transactions/route.ts
const client = new LemonwayClient(config)

// 1. Crear registro de log (pre-logging)
const logId = await client.logApiCall(
  "/transactions/GetWalletTransactions", // endpoint
  "GET", // method
  { startDate: "1704067200", endDate: "1704153600" }, // request payload
  null, // response (aún no existe)
  0,
  false,
  null,
  0
)

// 2. Construir parámetros
const queryParams = {
  startDate: Math.floor(new Date("2024-01-01").getTime() / 1000), // Unix timestamp
  endDate: Math.floor(new Date("2024-01-02").getTime() / 1000)
}

// 3. Ejecutar
const result = await client.executeAndUpdateLog(
  logId,
  "/transactions/GetWalletTransactions",
  "GET",
  queryParams
)

// URL generada:
// https://sandbox-api.lemonway.fr/mb/urbix/dev/directkitrest/v2/transactions/GetWalletTransactions?startDate=1704067200&endDate=1704153600
\`\`\`

### 4.3 Ejemplo 2: POST - Crear Movimiento (Body JSON)

\`\`\`typescript
// app/api/lemonway/create-transaction/route.ts
const logId = await client.logApiCall(
  "/transactions/SendMoney", // endpoint
  "POST",
  {
    debitWallet: "123456",
    creditWallet: "654321",
    amount: 10000, // En centavos
    currency: "EUR"
  },
  null,
  0,
  false,
  null,
  0
)

const requestBody = {
  debitWallet: account.lemonway_wallet_id,
  creditWallet: recipientWallet.lemonway_wallet_id,
  amount: Math.round(investmentAmount * 100), // Convertir a centavos
  currency: "EUR",
  metadata: {
    type: "INVESTMENT",
    investmentId: investment.id
  }
}

const result = await client.executeAndUpdateLog(
  logId,
  "/transactions/SendMoney",
  "POST",
  requestBody
)

// Request generado:
// POST https://sandbox-api.lemonway.fr/mb/urbix/dev/directkitrest/v2/transactions/SendMoney
// Body: { "debitWallet": "123456", ... }
\`\`\`

---

## 5. MAPEO DE DATOS LEMONWAY → URBIX

### 5.1 Tabla de Mapeo: `lemonway_temp."MappedFields"`

\`\`\`sql
CREATE TABLE lemonway_temp."MappedFields" (
  id SERIAL PRIMARY KEY,
  lemonway_field_name VARCHAR(255),
  urbix_field_name VARCHAR(255),
  data_type VARCHAR(50),
  transformation JSONB -- Cómo transformar el valor
);
\`\`\`

**Ejemplos de mappings:**
\`\`\`json
[
  {
    "lemonway_field": "debitWalletId",
    "urbix_field": "debit_wallet_id",
    "data_type": "string",
    "transformation": null
  },
  {
    "lemonway_field": "debitAmount",
    "urbix_field": "importe",
    "data_type": "number",
    "transformation": { "divide_by": 100 } // Centavos a euros
  },
  {
    "lemonway_field": "transactionDate",
    "urbix_field": "fecha",
    "data_type": "timestamp",
    "transformation": { "from_unix_timestamp": true }
  }
]
\`\`\`

### 5.2 Transformación en Código

\`\`\`typescript
// lib/lemonway-type-mapper.ts
export class LemonwayTypeMapper {
  static transformTransaction(lemonwayTx: LemonwayTransactionIn): TransactionProcessed {
    return {
      lemonway_transaction_id: lemonwayTx.id,
      fecha: new Date(lemonwayTx.transactionDate * 1000),
      importe: lemonwayTx.debitAmount / 100, // Convertir centavos a euros
      concepto: lemonwayTx.label,
      debit_wallet_id: lemonwayTx.debitWalletId,
      credit_wallet_id: lemonwayTx.creditWalletId,
      // ... resto de mapeos
    }
  }
}
\`\`\`

---

## 6. VARIABLES DE ENTORNO

**Si bien la configuración está en BD, estas variables de entorno se utilizan para inicializar:**

\`\`\`env
# Variables para PRIMERA configuración (script de setup)
LEMONWAY_ENVIRONMENT=sandbox|production
LEMONWAY_API_TOKEN=base64_encoded_oauth_token
LEMONWAY_WALLET_ID=urbix_wallet_id_from_lemonway
LEMONWAY_ENVIRONMENT_NAME=urbix
\`\`\`

**Flujo:**
1. Deploy de app
2. Admin ejecuta script de setup que lee estas variables
3. Script inserta en `public."LemonwayConfig"`
4. De ahí en adelante, TODO se lee de BD (no de .env)

---

## 7. SISTEMA DE COLAS (RATE LIMITING)

### 7.1 Implementación: Algoritmo de Cola Interna

\`\`\`typescript
// lib/lemonway-client.ts líneas 37-45
private requestQueue: Array<{
  fn: () => Promise<any>
  resolve: (value: any) => void
  reject: (error: any) => void
}> = []
private activeRequests = 0
private lastRequestTime = 0
private maxConcurrentRequests = 3 // De BD: config.maxConcurrentRequests
private minDelayMs = 1000 // De BD: config.minDelayBetweenRequestsMs
\`\`\`

### 7.2 Procesamiento de Cola

\`\`\`typescript
// Cuando añadir a cola:
private async enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    this.requestQueue.push({ fn, resolve, reject })
    this.processQueue()
  })
}

// Procesar cola:
private async processQueue() {
  while (this.requestQueue.length > 0 && this.activeRequests < this.maxConcurrentRequests) {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime

    if (timeSinceLastRequest < this.minDelayMs) {
      // Esperar antes de procesar siguiente
      await new Promise(resolve => 
        setTimeout(resolve, this.minDelayMs - timeSinceLastRequest)
      )
    }

    this.activeRequests++
    const { fn, resolve, reject } = this.requestQueue.shift()!

    try {
      const result = await fn()
      resolve(result)
    } catch (error) {
      reject(error)
    } finally {
      this.activeRequests--
      this.lastRequestTime = Date.now()
      this.processQueue() // Procesar siguiente
    }
  }
}
\`\`\`

---

## 8. REINTENTOS AUTOMÁTICOS

### 8.1 Configuración de Reintentos: `public."LemonwayRetryConfig"`

\`\`\`sql
CREATE TABLE "LemonwayRetryConfig" (
  id SERIAL PRIMARY KEY,
  max_retry_attempts INT DEFAULT 5,
  retry_delay_seconds INT DEFAULT 5,
  exponential_backoff BOOLEAN DEFAULT true,
  backoff_multiplier FLOAT DEFAULT 2.0,
  max_backoff_seconds INT DEFAULT 300,
  manual_retry_enabled BOOLEAN DEFAULT true
);
\`\`\`

### 8.2 Lógica de Reintentos

\`\`\`typescript
// lib/lemonway-retry-config.ts
export async function getRetryConfig() {
  const result = await sql`SELECT * FROM "LemonwayRetryConfig" LIMIT 1`
  return {
    maxRetryAttempts: result[0]?.max_retry_attempts || 5,
    retryDelaySeconds: result[0]?.retry_delay_seconds || 5,
    exponentialBackoff: result[0]?.exponential_backoff ?? true,
    backoffMultiplier: result[0]?.backoff_multiplier || 2.0
  }
}

// En el reintento:
const nextRetryAt = new Date()
if (exponentialBackoff) {
  const delayMs = Math.min(
    retryDelaySeconds * Math.pow(backoffMultiplier, retryCount) * 1000,
    maxBackoffSeconds * 1000
  )
  nextRetryAt.setMilliseconds(nextRetryAt.getMilliseconds() + delayMs)
}

// Reintento 0: 5s
// Reintento 1: 10s (5 * 2)
// Reintento 2: 20s (5 * 2 * 2)
// Reintento 3: 40s (5 * 2 * 2 * 2)
// Reintento 4: 80s (5 * 2 * 2 * 2 * 2)
// Reintento 5+: 300s (cap)
\`\`\`

---

## 9. MONITOREO Y DEBUGGING

### 9.1 Visualizar Todas las Queries Ejecutadas

\`\`\`sql
-- Ver últimas 20 queries
SELECT 
  id,
  endpoint,
  method,
  response_status,
  success,
  error_message,
  duration_ms,
  created_at
FROM "LemonwayApiCallLog"
ORDER BY created_at DESC
LIMIT 20;

-- Ver con payloads
SELECT 
  id,
  endpoint,
  request_payload::jsonb,
  response_payload::jsonb,
  success,
  error_message
FROM "LemonwayApiCallLog"
WHERE success = false
ORDER BY created_at DESC;
\`\`\`

### 9.2 Visualizar Estado de Reintentos

\`\`\`sql
-- Llamadas pendientes de reintento
SELECT 
  id,
  endpoint,
  retry_count,
  retry_status,
  next_retry_at,
  error_message
FROM "LemonwayApiCallLog"
WHERE retry_status = 'pending'
ORDER BY next_retry_at ASC;

-- Fallas finales que necesitan revisión manual
SELECT 
  id,
  endpoint,
  final_failure,
  manual_retry_needed,
  error_message
FROM "LemonwayApiCallLog"
WHERE final_failure = true AND manual_retry_needed = true;
\`\`\`

### 9.3 Logs de Debug en Código

\`\`\`typescript
// En lemonway-client.ts se loguea:
console.log("[v0] [Lemonway] getConfig - api_token exists:", !!config.api_token)
console.log("[v0] [Lemonway] Bearer token obtained, expires at:", expiresAt)
console.log("[v0] [Lemonway] API call logged with ID:", insertedId)
console.log("[v0] Transacciones recibidas para log:", logId)
\`\`\`

---

## 10. RESUMEN: DÓNDE SE GUARDA TODO

| Información | Ubicación | Tabla/Archivo | Tipo |
|-----------|----------|------|------|
| **Config API** | BD | `public."LemonwayConfig"` | Table |
| **URLs base** | Código | `lib/lemonway-client.ts` | TypeScript |
| **OAuth token** | BD | `public."LemonwayConfig".api_token` | ENCRYPTED |
| **Bearer token** | Memoria | `LemonwayClient.bearerToken` | Cache (90 días) |
| **Endpoints disponibles** | BD | `public."LemonwayApiMethod"` | Table |
| **Métodos deshabilitados** | BD | `public."LemonwayDisabledMethods"` | Table |
| **Logs de queries** | BD | `public."LemonwayApiCallLog"` | Table |
| **Historial de reintentos** | BD | `public."LemonwayApiCallRetryHistory"` | Table |
| **Configuración de reintentos** | BD | `public."LemonwayRetryConfig"` | Table |
| **Mapeo de campos** | BD | `lemonway_temp."MappedFields"` | Table |
| **Rate limiting config** | Código | `lib/lemonway-client.ts` | TypeScript |
| **Queries construidas** | BD | `public."LemonwayApiCallLog".request_payload` | JSONB |

---

**Documento: LEMONWAY-CONFIGURACION-QUERIES.md v1.0**
