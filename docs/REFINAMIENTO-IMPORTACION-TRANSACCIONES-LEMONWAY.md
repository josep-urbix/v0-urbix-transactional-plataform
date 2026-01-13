# Refinamiento Técnico: Sistema de Importación de Transacciones Lemonway a Cuentas Virtuales Temporales

## 1. Resumen Ejecutivo

Sistema para importar transacciones desde Lemonway hacia tablas temporales del schema `lemonway_temp`, con procesamiento asíncrono, historial de ejecuciones, y UI de gestión integrada en el API Explorer.

**Objetivo:** Crear una tubería (pipeline) completa para traer transacciones de cuentas Lemonway, mapearlas a cuentas virtuales internas, y guardarlas en tablas temporales para posterior revisión y aprobación.

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (UI)                                │
├─────────────────────────────────────────────────────────────────────┤
│ 1. API Explorer UI (/dashboard/lemonway-api-explorer)              │
│    - Nuevo tab "Importación de Transacciones"                      │
│    - Formulario: accountId, dateFrom, dateTo                       │
│    - Botón: "Iniciar Importación"                                  │
│                                                                      │
│ 2. Historial de Importaciones (/dashboard/lemonway/imports)        │
│    - Lista de imports con estados y stats                          │
│    - Detalles por import (transacciones procesadas, errores)       │
│    - Botón "Reintentar" para imports fallidos                      │
│                                                                      │
│ 3. Movimientos Temporales (/dashboard/lemonway/temp-movimientos)   │
│    - Tabla con movimientos importados                              │
│    - Filtros: cuenta_virtual, fecha, tipo_operacion                │
│    - Estado: pendiente_revision, aprobado, rechazado               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API REST                                    │
├─────────────────────────────────────────────────────────────────────┤
│ POST /api/lemonway-imports/start                                    │
│   → Valida params, registra import, encola job asíncrono           │
│   → Retorna: { runId, status: "queued" }                           │
│                                                                      │
│ GET /api/lemonway-imports/[runId]                                   │
│   → Retorna detalles del import y progreso actual                  │
│                                                                      │
│ POST /api/lemonway-imports/[runId]/retry                            │
│   → Reintenta procesamiento con datos de LemonwayApiCallLog        │
│                                                                      │
│ GET /api/lemonway-temp/movimientos                                  │
│   → Lista movimientos con filtros                                  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PROCESAMIENTO ASÍNCRONO                           │
├─────────────────────────────────────────────────────────────────────┤
│ Job Worker (Next.js API Route con locking)                         │
│  1. Actualiza import status: "queued" → "processing"               │
│  2. Llama a Lemonway GET /accounts/{accountId}/transactions        │
│  3. Guarda respuesta en LemonwayApiCallLog                         │
│  4. Para cada transacción:                                          │
│     a. Mapea accountId → cuenta_virtual_id                         │
│     b. Inserta en lemonway_temp.movimientos_cuenta                 │
│  5. Actualiza stats y status: "processing" → "completed"           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BASE DE DATOS                                │
├─────────────────────────────────────────────────────────────────────┤
│ Schema: lemonway_temp                                               │
│                                                                      │
│ Table: import_runs                                                  │
│   - id (uuid, PK)                                                   │
│   - account_id (text) - Lemonway accountId                         │
│   - cuenta_virtual_id (uuid FK) - Mapped cuenta virtual            │
│   - date_from (timestamp)                                           │
│   - date_to (timestamp)                                             │
│   - status (enum: queued, processing, completed, failed)           │
│   - total_transactions (int)                                        │
│   - processed_count (int)                                           │
│   - error_count (int)                                               │
│   - api_call_log_id (int FK → LemonwayApiCallLog)                 │
│   - error_message (text)                                            │
│   - started_at, finished_at, created_at                            │
│                                                                      │
│ Table: cuentas_virtuales                                            │
│   - id (uuid, PK)                                                   │
│   - lemonway_account_id (text) - accountId de Lemonway            │
│   - nombre (text)                                                   │
│   - tipo (enum)                                                     │
│   - saldo_disponible, saldo_bloqueado (numeric)                   │
│   - estado (enum)                                                   │
│   - created_at, updated_at                                          │
│                                                                      │
│ Table: movimientos_cuenta                                           │
│   - id (uuid, PK)                                                   │
│   - import_run_id (uuid FK → import_runs)                          │
│   - cuenta_virtual_id (uuid FK → cuentas_virtuales)               │
│   - lemonway_transaction_id (text) - ID original de Lemonway      │
│   - fecha_transaccion (timestamp)                                   │
│   - tipo_operacion_id (uuid FK, nullable) - Por ahora NULL        │
│   - importe (numeric)                                               │
│   - moneda (text, default: 'EUR')                                  │
│   - concepto (text)                                                 │
│   - saldo_previo (numeric, nullable) - PENDIENTE                  │
│   - saldo_posterior (numeric, nullable) - PENDIENTE               │
│   - metadata_lemonway (jsonb) - Respuesta completa                │
│   - estado_importacion (enum: pendiente, aprobado, rechazado)     │
│   - created_at, updated_at                                          │
│                                                                      │
│ Table: tipos_operacion_contable                                     │
│   - id (uuid, PK)                                                   │
│   - codigo (text, unique)                                           │
│   - nombre (text)                                                   │
│   - descripcion (text)                                              │
│   - activo (boolean)                                                │
│   - created_at, updated_at                                          │
│                                                                      │
│ Table existing: public.LemonwayApiCallLog                          │
│   - Almacena request/response del endpoint Lemonway                │
│   - Usado para retry sin re-llamar a Lemonway                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modelo de Datos Detallado

### 3.1 Schema `lemonway_temp`

#### Tabla: `import_runs`

```sql
CREATE TYPE import_status AS ENUM ('queued', 'processing', 'completed', 'failed', 'retrying');

CREATE TABLE lemonway_temp.import_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL,
  cuenta_virtual_id UUID REFERENCES lemonway_temp.cuentas_virtuales(id),
  date_from TIMESTAMP NOT NULL,
  date_to TIMESTAMP NOT NULL,
  status import_status NOT NULL DEFAULT 'queued',
  
  total_transactions INT DEFAULT 0,
  processed_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  
  api_call_log_id INT REFERENCES public."LemonwayApiCallLog"(id),
  error_message TEXT,
  retry_count INT DEFAULT 0,
  
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT NOT NULL,
  
  INDEX idx_import_runs_status (status),
  INDEX idx_import_runs_account (account_id),
  INDEX idx_import_runs_cuenta_virtual (cuenta_virtual_id),
  INDEX idx_import_runs_created (created_at DESC)
);
```

#### Tabla: `cuentas_virtuales`

```sql
CREATE TYPE cuenta_virtual_tipo AS ENUM ('INVERSOR', 'PROMOTOR', 'SISTEMA', 'COMISIONES');
CREATE TYPE cuenta_virtual_estado AS ENUM ('ACTIVA', 'BLOQUEADA', 'CERRADA');

CREATE TABLE lemonway_temp.cuentas_virtuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lemonway_account_id TEXT UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo cuenta_virtual_tipo NOT NULL,
  
  saldo_disponible NUMERIC(15, 2) DEFAULT 0.00,
  saldo_bloqueado NUMERIC(15, 2) DEFAULT 0.00,
  moneda TEXT DEFAULT 'EUR',
  
  estado cuenta_virtual_estado DEFAULT 'ACTIVA',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_cuentas_lemonway_account (lemonway_account_id),
  INDEX idx_cuentas_tipo (tipo),
  INDEX idx_cuentas_estado (estado)
);
```

#### Tabla: `movimientos_cuenta`

```sql
CREATE TYPE movimiento_estado_importacion AS ENUM ('pendiente_revision', 'aprobado', 'rechazado');

CREATE TABLE lemonway_temp.movimientos_cuenta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_run_id UUID NOT NULL REFERENCES lemonway_temp.import_runs(id) ON DELETE CASCADE,
  cuenta_virtual_id UUID NOT NULL REFERENCES lemonway_temp.cuentas_virtuales(id),
  
  lemonway_transaction_id TEXT NOT NULL,
  fecha_transaccion TIMESTAMP NOT NULL,
  
  tipo_operacion_id UUID REFERENCES lemonway_temp.tipos_operacion_contable(id),
  importe NUMERIC(15, 2) NOT NULL,
  moneda TEXT DEFAULT 'EUR',
  concepto TEXT,
  
  saldo_previo NUMERIC(15, 2),
  saldo_posterior NUMERIC(15, 2),
  
  metadata_lemonway JSONB NOT NULL,
  estado_importacion movimiento_estado_importacion DEFAULT 'pendiente_revision',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE (lemonway_transaction_id, import_run_id),
  INDEX idx_movimientos_import_run (import_run_id),
  INDEX idx_movimientos_cuenta_virtual (cuenta_virtual_id),
  INDEX idx_movimientos_fecha (fecha_transaccion DESC),
  INDEX idx_movimientos_estado (estado_importacion),
  INDEX idx_movimientos_lemonway_tx (lemonway_transaction_id)
);
```

#### Tabla: `tipos_operacion_contable`

```sql
CREATE TABLE lemonway_temp.tipos_operacion_contable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_tipos_operacion_codigo (codigo),
  INDEX idx_tipos_operacion_activo (activo)
);
```

---

## 4. Lógica de Vinculación accountId → cuenta_virtual_id

### 4.1 Fuente de Datos

Basado en el análisis del código existente en `/dashboard/investors/wallets` y la API `/api/admin/virtual-accounts/link-wallet`:

**Tablas involucradas:**
1. `payments.payment_accounts` - Contiene wallets de Lemonway con:
   - `account_id` (TEXT) - El accountId de Lemonway
   - `cuenta_virtual_id` (UUID) - FK a `virtual_accounts.cuentas_virtuales`

2. `virtual_accounts.cuentas_virtuales` - Cuentas virtuales internas con:
   - `lemonway_account_id` (TEXT) - Copia del accountId de Lemonway

### 4.2 Algoritmo de Mapeo

```typescript
async function mapAccountIdToCuentaVirtual(lemonwayAccountId: string): Promise<string | null> {
  // Opción 1: Buscar en payment_accounts
  const paymentAccount = await sql`
    SELECT cuenta_virtual_id 
    FROM payments.payment_accounts
    WHERE account_id = ${lemonwayAccountId}
      AND cuenta_virtual_id IS NOT NULL
    LIMIT 1
  `;
  
  if (paymentAccount.length > 0) {
    return paymentAccount[0].cuenta_virtual_id;
  }
  
  // Opción 2: Buscar directamente en cuentas_virtuales
  const cuentaVirtual = await sql`
    SELECT id
    FROM virtual_accounts.cuentas_virtuales
    WHERE lemonway_account_id = ${lemonwayAccountId}
    LIMIT 1
  `;
  
  if (cuentaVirtual.length > 0) {
    return cuentaVirtual[0].id;
  }
  
  // Si no existe, copiar a lemonway_temp.cuentas_virtuales
  const tempCuenta = await sql`
    INSERT INTO lemonway_temp.cuentas_virtuales (
      lemonway_account_id,
      nombre,
      tipo,
      estado
    ) VALUES (
      ${lemonwayAccountId},
      ${'Cuenta Temporal - ' + lemonwayAccountId},
      'SISTEMA',
      'ACTIVA'
    )
    RETURNING id
  `;
  
  return tempCuenta[0].id;
}
```

### 4.5 Estructura Real de la Respuesta de Lemonway

#### Respuesta del endpoint GET /accounts/{accountId}/transactions

```json
{
  "transactions": {
    "value": [
      {
        "transactionIn": {
          "receiverAccountId": "pizza",
          "creditAmount": 1500,
          "scheduledDate": "2015/12/31",
          "scheduledNumber": null,
          "PSP": {
            "message": "05-00-05 ERR_PSP_REFUSED"
          },
          "card": {
            "id": 0,
            "is3DS": true,
            "country": "FRA",
            "maskedNumber": "455622",
            "isRegistered": false,
            "holderName": "Peter PAN"
          },
          "refundAmount": 1500,
          "bankReference": null,
          "ChequeSendingAddress_CorporateName": null,
          "ChequeSendingAddress_Street": null,
          "ChequeSendingAddress_City": null,
          "ChequeSendingAddress_PostCode": null,
          "id": 255,
          "method": 0,
          "date": 1761995913,
          "commissionAmount": 200,
          "comment": "Order number 245776",
          "status": 0,
          "executionDate": 0,
          "reference": null
        }
      }
    ]
  }
}
```

#### Mapeo de Campos Lemonway → movimientos_cuenta

| Campo Destino | Campo Origen Lemonway | Transformación | Notas |
|---|---|---|---|
| `lemonway_transaction_id` | `transactionIn.id` | `toString()` | ID único de Lemonway |
| `fecha_transaccion` | `transactionIn.date` | Unix timestamp → ISO | `new Date(tx.date * 1000).toISOString()` |
| `importe` | `transactionIn.creditAmount` | `/100` | Viene en centavos, dividir por 100 |
| `moneda` | - | `'EUR'` (hardcoded) | Por defecto EUR |
| `concepto` | `transactionIn.comment` | Direct | Comentario/descripción |
| `tipo_operacion_id` | - | `NULL` | Se configurará posteriormente |
| `saldo_previo` | - | `NULL` | PENDIENTE: No viene en respuesta |
| `saldo_posterior` | - | `NULL` | PENDIENTE: No viene en respuesta |
| `metadata_lemonway` | `transactionIn` (completo) | `JSON.stringify()` | Guardar objeto completo |
| `estado_importacion` | - | `'pendiente_revision'` | Default |

#### Tipos TypeScript para la Respuesta

```typescript
interface LemonwayTransactionResponse {
  transactions: {
    value: Array<{
      transactionIn: {
        id: number;
        receiverAccountId: string;
        creditAmount: number; // En centavos
        date: number; // Unix timestamp
        comment: string | null;
        method: number;
        status: number;
        executionDate: number;
        commissionAmount: number;
        refundAmount: number;
        scheduledDate: string | null;
        scheduledNumber: number | null;
        bankReference: string | null;
        reference: string | null;
        PSP?: {
          message: string;
        };
        card?: {
          id: number;
          is3DS: boolean;
          country: string;
          maskedNumber: string;
          isRegistered: boolean;
          holderName: string;
        };
        ChequeSendingAddress_CorporateName?: string | null;
        ChequeSendingAddress_Street?: string | null;
        ChequeSendingAddress_City?: string | null;
        ChequeSendingAddress_PostCode?: string | null;
      };
    }>
  };
}
```

---

## 5. Nuevo Endpoint en Lemonway Client

### 5.1 Agregar método a `lib/lemonway-client.ts`

```typescript
/**
 * Obtiene transacciones de una cuenta específica con filtros de fecha
 * GET /accounts/{accountId}/transactions
 */
async getAccountTransactions(
  accountId: string,
  params?: {
    dateFrom?: string;  // ISO 8601: "2024-01-01T00:00:00Z"
    dateTo?: string;
    limit?: number;
    offset?: number;
  }
): Promise<LemonwayTransactionResponse> {
  // Verificar si el método está habilitado
  const methodEnabled = await this.isMethodEnabled('getAccountTransactions');
  if (!methodEnabled) {
    throw new Error('El método getAccountTransactions está deshabilitado en la configuración');
  }

  const queryParams = new URLSearchParams();
  if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
  if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());

  const url = `/accounts/${accountId}/transactions?${queryParams.toString()}`;
  
  return this.makeRequest<LemonwayTransactionResponse>('GET', url, null, {
    endpoint: url,
    method: 'getAccountTransactions',
    retry_status: 'pending'
  });
}
```

### 5.2 Agregar a API Explorer

Insertar en `lemonway_api_methods`:

```sql
INSERT INTO lemonway_api_methods (
  name,
  endpoint,
  http_method,
  category,
  description,
  is_enabled,
  request_schema,
  response_schema,
  example_request,
  example_response
) VALUES (
  'getAccountTransactions',
  '/accounts/{accountId}/transactions',
  'GET',
  'Transactions',
  'Obtiene el historial de transacciones de una cuenta con filtros de fecha',
  true,
  '{"type":"object","properties":{"accountId":{"type":"string","description":"ID de la cuenta Lemonway"},"dateFrom":{"type":"string","format":"date-time"},"dateTo":{"type":"string","format":"date-time"},"limit":{"type":"integer"},"offset":{"type":"integer"}}}',
  '{"type":"object","properties":{"transactions":{"type":"array"},"total":{"type":"integer"}}}',
  '{"accountId":"12345","dateFrom":"2024-01-01T00:00:00Z","dateTo":"2024-01-31T23:59:59Z","limit":100}',
  '{"transactions":[{"id":"tx_123","amount":1500,"currency":"EUR","date":1761995913}],"total":45}'
);
```

---

## 6. APIs REST

### 6.1 POST `/api/lemonway-imports/start`

**Request:**
```json
{
  "accountId": "12345",
  "dateFrom": "2024-01-01T00:00:00Z",
  "dateTo": "2024-01-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "runId": "uuid-here",
  "status": "queued",
  "message": "Importación encolada correctamente"
}
```

**Flujo:**
1. Validar params (accountId, dateFrom, dateTo)
2. Verificar permisos RBAC (`lemonway_imports:create`)
3. Mapear accountId → cuenta_virtual_id
4. Insertar en `import_runs` con status `queued`
5. Encolar job asíncrono (ver sección 7)
6. Retornar runId

### 6.2 GET `/api/lemonway-imports/[runId]`

**Response:**
```json
{
  "id": "uuid",
  "accountId": "12345",
  "status": "processing",
  "totalTransactions": 150,
  "processedCount": 45,
  "errorCount": 2,
  "startedAt": "2024-01-15T10:00:00Z",
  "progress": 30,
  "errors": [
    {
      "transactionId": "tx_123",
      "error": "Invalid amount format"
    }
  ]
}
```

### 6.3 POST `/api/lemonway-imports/[runId]/retry`

**Flujo:**
1. Verificar que status sea `failed`
2. Obtener `api_call_log_id` del import_run
3. Leer respuesta guardada en `LemonwayApiCallLog`
4. Reprocesar datos SIN llamar a Lemonway nuevamente
5. Actualizar status y contadores

### 6.4 GET `/api/lemonway-temp/movimientos`

**Query Params:**
- `import_run_id` (optional)
- `cuenta_virtual_id` (optional)
- `estado_importacion` (optional)
- `date_from`, `date_to` (optional)
- `page`, `limit`

**Response:**
```json
{
  "movimientos": [...],
  "pagination": {
    "total": 500,
    "page": 1,
    "limit": 50,
    "totalPages": 10
  }
}
```

---

## 7. Procesamiento Asíncrono

### 7.1 Arquitectura

**Opción implementada:** Next.js API Route con locking manual usando base de datos

```
POST /api/lemonway-imports/start
  ↓
  Inserta import_run (status: queued)
  ↓
  Retorna runId inmediatamente
  ↓
[En paralelo, otro request o cron activa]
  ↓
POST /api/lemonway-imports/process-next
  ↓
  1. SELECT ... WHERE status='queued' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
  2. UPDATE status='processing'
  3. Llama a Lemonway
  4. Guarda en LemonwayApiCallLog
  5. Procesa transacciones
  6. UPDATE status='completed'
```

### 7.2 Worker Implementation - Actualizado con estructura real

```typescript
// app/api/lemonway-imports/process-next/route.ts

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Lock next queued import
  const nextImport = await sql`
    SELECT * FROM lemonway_temp.import_runs
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;

  if (nextImport.length === 0) {
    return NextResponse.json({ message: 'No pending imports' });
  }

  const importRun = nextImport[0];

  try {
    // 2. Update status
    await sql`
      UPDATE lemonway_temp.import_runs
      SET status = 'processing', started_at = NOW()
      WHERE id = ${importRun.id}
    `;

    // 3. Call Lemonway
    const lemonwayClient = await getLemonwayClient();
    const response = await lemonwayClient.getAccountTransactions(
      importRun.account_id,
      {
        dateFrom: importRun.date_from,
        dateTo: importRun.date_to,
      }
    );

    // 4. LemonwayApiCallLog ya se guarda automáticamente en makeRequest()
    // Obtener el ID del último log insertado
    const lastLog = await sql`
      SELECT id FROM public."LemonwayApiCallLog"
      WHERE endpoint LIKE ${`%/accounts/${importRun.account_id}/transactions%`}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const apiCallLogId = lastLog[0]?.id;

    // 5. Process each transaction
    let processedCount = 0;
    let errorCount = 0;
    const errors: Array<{ txId: string; error: string }> = [];

    const transactions = response.transactions?.value || [];
    const totalTransactions = transactions.length;

    for (const txWrapper of transactions) {
      try {
        const tx = txWrapper.transactionIn;
        
        // Convertir fecha de Unix timestamp a ISO
        const fechaTransaccion = new Date(tx.date * 1000).toISOString();
        
        // Convertir importe de centavos a euros
        const importe = (tx.creditAmount || 0) / 100;

        await sql`
          INSERT INTO lemonway_temp.movimientos_cuenta (
            import_run_id,
            cuenta_virtual_id,
            lemonway_transaction_id,
            fecha_transaccion,
            importe,
            moneda,
            concepto,
            metadata_lemonway,
            estado_importacion
          ) VALUES (
            ${importRun.id},
            ${importRun.cuenta_virtual_id},
            ${tx.id.toString()},
            ${fechaTransaccion},
            ${importe},
            ${'EUR'},
            ${tx.comment || 'Sin descripción'},
            ${JSON.stringify(tx)},
            'pendiente_revision'
          )
          ON CONFLICT (lemonway_transaction_id, import_run_id) DO NOTHING
        `;
        processedCount++;
      } catch (error: any) {
        errorCount++;
        errors.push({
          txId: txWrapper.transactionIn?.id?.toString() || 'unknown',
          error: error.message
        });
      }
    }

    // 6. Update import_run with results
    await sql`
      UPDATE lemonway_temp.import_runs
      SET 
        status = 'completed',
        total_transactions = ${totalTransactions},
        processed_count = ${processedCount},
        error_count = ${errorCount},
        api_call_log_id = ${apiCallLogId},
        finished_at = NOW(),
        error_message = ${errors.length > 0 ? JSON.stringify(errors) : null}
      WHERE id = ${importRun.id}
    `;

    return NextResponse.json({
      success: true,
      runId: importRun.id,
      stats: {
        total: totalTransactions,
        processed: processedCount,
        errors: errorCount
      }
    });

  } catch (error: any) {
    // Mark as failed
    await sql`
      UPDATE lemonway_temp.import_runs
      SET 
        status = 'failed',
        error_message = ${error.message},
        finished_at = NOW()
      WHERE id = ${importRun.id}
    `;

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 7.3 Cron Job Activador

```typescript
// app/api/cron/process-lemonway-imports/route.ts

export async function GET(request: NextRequest) {
  // Verificar cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Procesar hasta 5 imports en paralelo
  const results = [];
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/lemonway-imports/process-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.message === 'No pending imports') break;
    results.push(data);
  }

  return NextResponse.json({ processed: results.length, results });
}
```

---

## 8. UI Components

### 8.1 Extensión del API Explorer

**Ubicación:** Nuevo tab en `/dashboard/lemonway-api-explorer`

**Componente:** `components/lemonway-api/transaction-importer.tsx`

```tsx
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export function TransactionImporter() {
  const [accountId, setAccountId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/lemonway-imports/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          dateFrom: new Date(dateFrom).toISOString(),
          dateTo: new Date(dateTo).toISOString()
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Importación iniciada',
          description: `Run ID: ${data.runId}`
        })
        // Redirect to imports list
        window.location.href = `/dashboard/lemonway/imports/${data.runId}`
      } else {
        toast({
          title: 'Error',
          description: data.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error al iniciar importación',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Transacciones desde Lemonway</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="accountId">Account ID de Lemonway</Label>
            <Input
              id="accountId"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="12345"
              required
            />
          </div>

          <div>
            <Label htmlFor="dateFrom">Fecha Desde</Label>
            <Input
              id="dateFrom"
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="dateTo">Fecha Hasta</Label>
            <Input
              id="dateTo"
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Iniciando...' : 'Iniciar Importación'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### 8.2 Página de Historial de Importaciones

**Ruta:** `/dashboard/lemonway/imports`

**Features:**
- Tabla con todas las importaciones
- Columnas: runId, accountId, status, dateRange, totalTx, processedCount, errorCount, createdAt
- Botón "Ver Detalles" → `/dashboard/lemonway/imports/[runId]`
- Botón "Reintentar" para imports fallidos
- Filtros: status, accountId, dateRange
- Paginación

### 8.3 Página de Movimientos Temporales

**Ruta:** `/dashboard/lemonway/temp-movimientos`

**Features:**
- Tabla con movimientos importados
- Columnas: fecha, cuenta_virtual, importe, concepto, estado_importacion
- Filtros: cuenta_virtual_id, estado_importacion, fecha
- Acciones: Aprobar, Rechazar (bulk selection)
- Export a CSV
- Paginación

---

## 9. Permisos RBAC

```typescript
// lib/auth/permissions.ts

export const LEMONWAY_IMPORT_PERMISSIONS = [
  {
    resource: 'lemonway_imports',
    action: 'view',
    name: 'lemonway_imports:view',
    description: 'Ver historial de importaciones'
  },
  {
    resource: 'lemonway_imports',
    action: 'create',
    name: 'lemonway_imports:create',
    description: 'Iniciar nuevas importaciones'
  },
  {
    resource: 'lemonway_imports',
    action: 'retry',
    name: 'lemonway_imports:retry',
    description: 'Reintentar importaciones fallidas'
  },
  {
    resource: 'lemonway_temp_movimientos',
    action: 'view',
    name: 'lemonway_temp_movimientos:view',
    description: 'Ver movimientos temporales'
  },
  {
    resource: 'lemonway_temp_movimientos',
    action: 'approve',
    name: 'lemonway_temp_movimientos:approve',
    description: 'Aprobar movimientos'
  },
  {
    resource: 'lemonway_temp_movimientos',
    action: 'reject',
    name: 'lemonway_temp_movimientos:reject',
    description: 'Rechazar movimientos'
  }
];
```

**Asignación:**
- `superadmin`: Todos los permisos
- `admin`: view, create, retry (imports) + view (movimientos)
- `operator`: view (imports) + view (movimientos)

---

## 10. Tareas Pendientes (FUTURO)

### 10.1 Mapeo de tipo_operacion_id

**Actualmente:** Se inserta NULL en `tipo_operacion_id`

**Futuro:** Crear tabla de mapeo:

```sql
CREATE TABLE lemonway_temp.transaction_type_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lemonway_transaction_type TEXT NOT NULL,
  lemonway_direction TEXT, -- CREDIT / DEBIT
  tipo_operacion_id UUID NOT NULL REFERENCES lemonway_temp.tipos_operacion_contable(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Ejemplos:**
- Lemonway `type: "money_in"` + `direction: "credit"` → `tipo_operacion_id: "INGRESO_INVERSOR"`
- Lemonway `type: "p2p"` + `direction: "debit"` → `tipo_operacion_id: "TRANSFERENCIA_SALIDA"`

### 10.2 Cálculo de Saldos

**Actualmente:** `saldo_previo` y `saldo_posterior` se insertan NULL

**Futuro:**
1. Obtener saldo inicial de la cuenta en `date_from`
2. Ordenar transacciones por fecha ASC
3. Para cada transacción:
   - `saldo_previo = saldo_actual`
   - `saldo_posterior = saldo_previo ± importe`
   - `saldo_actual = saldo_posterior`

**Nota:** Requiere endpoint de Lemonway para obtener balance histórico o calcular desde transacciones anteriores.

---

## 11. Plan de Implementación

### Fase 1: Infraestructura Base
1. ✅ Crear schema `lemonway_temp`
2. ✅ Crear tabla `import_runs`
3. ✅ Crear tabla `cuentas_virtuales`
4. ✅ Crear tabla `movimientos_cuenta`
5. ✅ Crear tabla `tipos_operacion_contable`
6. ✅ Insertar datos iniciales en `tipos_operacion_contable` (opcional, o dejar vacío)

### Fase 2: Backend - Lemonway Client
7. ✅ Agregar método `getAccountTransactions()` en `lib/lemonway-client.ts`
8. ✅ Insertar método en `lemonway_api_methods`
9. ✅ Probar método en API Explorer existente

### Fase 3: Backend - APIs REST
10. ✅ Crear `POST /api/lemonway-imports/start`
11. ✅ Crear `GET /api/lemonway-imports/[runId]`
12. ✅ Crear `POST /api/lemonway-imports/[runId]/retry`
13. ✅ Crear `GET /api/lemonway-temp/movimientos`
14. ✅ Crear worker `POST /api/lemonway-imports/process-next`
15. ✅ Crear cron job `/api/cron/process-lemonway-imports`

### Fase 4: Frontend - UI
16. ✅ Extender API Explorer con tab "Importación"
17. ✅ Crear página `/dashboard/lemonway/imports`
18. ✅ Crear página `/dashboard/lemonway/imports/[runId]` (detalles)
19. ✅ Crear página `/dashboard/lemonway/temp-movimientos`
20. ✅ Actualizar sidebar con nuevas secciones

### Fase 5: Permisos y Seguridad
21. ✅ Agregar permisos RBAC
22. ✅ Integrar permisos en todas las APIs
23. ✅ Testing de permisos por rol

### Fase 6: Testing y Documentación
24. ✅ Testing end-to-end
25. ✅ Documentación de usuario
26. ✅ Documentación técnica

---

## 12. Consideraciones de Seguridad

1. **Rate Limiting:** El worker debe respetar los límites de Lemonway (max 3 concurrent requests)
2. **Idempotencia:** La constraint `UNIQUE (lemonway_transaction_id, import_run_id)` previene duplicados
3. **Locking:** El `FOR UPDATE SKIP LOCKED` previene procesamiento concurrente del mismo import
4. **Auditoría:** Todas las llamadas a Lemonway se guardan en `LemonwayApiCallLog`
5. **RBAC:** Todos los endpoints verifican permisos antes de ejecutar

---

## 13. Métricas y Monitoreo

**Dashboard de Importaciones:**
- Total imports: queued, processing, completed, failed
- Average processing time
- Success rate (%)
- Transacciones procesadas últimas 24h
- Errors más comunes

**Alertas:**
- Import en status "processing" por más de 10 minutos
- Error rate > 10%
- Más de 10 imports queued sin procesar

---

## 14. Preguntas Pendientes

1. ¿Cuántas transacciones puede devolver el endpoint de Lemonway por llamada? ¿Hay paginación?
2. ¿Se debe limitar el rango de fechas máximo (ej: 1 mes)?
3. ¿Los movimientos aprobados se deben copiar a `virtual_accounts.movimientos_cuenta` automáticamente o manualmente?
4. ¿Se debe notificar por email cuando una importación termina (completada o fallida)?

---

**Documento creado:** 2025-01-08  
**Versión:** 1.0  
**Autor:** v0 AI Assistant
