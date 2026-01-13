# Sistema de Importación de Transacciones de Lemonway

## Descripción General

Sistema asíncrono para importar transacciones desde Lemonway hacia un schema temporal (`lemonway_temp`) donde pueden ser revisadas, editadas y aprobadas antes de migrar a la contabilidad definitiva.

## Arquitectura

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    Sistema de Importación                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │  UI: /dashboard/lemonway/imports       │
         │  - Botón "Nueva Importación"           │
         │  - Lista de importaciones              │
         │  - Detalle de cada run                 │
         └────────────────┬───────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────────┐
         │  API: POST /api/lemonway/imports/start │
         │  - Crea ImportRun (status: pending)    │
         │  - Retorna runId inmediatamente        │
         └────────────────┬───────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────────┐
         │  Worker Asíncrono (Cron Job)           │
         │  - Procesa ImportRuns pendientes       │
         │  - Llama a Lemonway API                │
         │  - Transforma y guarda datos           │
         │  - Actualiza estado del run            │
         └────────────────┬───────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────────┐
         │  Schema: lemonway_temp                 │
         │  - import_runs                         │
         │  - cuentas_virtuales (mapeo)          │
         │  - tipos_operacion_contable            │
         │  - movimientos_cuenta                  │
         └────────────────────────────────────────┘
\`\`\`

## Flujo de Importación

### 1. Inicio de Importación

**Usuario:** Hace clic en "Nueva Importación"

**Sistema:**
1. Crea registro en `import_runs` con `status: 'pending'`
2. Retorna `runId` inmediatamente
3. UI muestra el run en estado "Procesando"

### 2. Procesamiento Asíncrono

**Cron Job** (`/api/cron/process-lemonway-imports`):
- Se ejecuta cada 2 minutos
- Busca `import_runs` con `status: 'pending'`
- Para cada uno:
  1. Actualiza a `status: 'processing'`
  2. Obtiene cuentas virtuales activas con `lemonway_account_id`
  3. Para cada cuenta:
     - Llama `GET /accounts/{accountId}/transactions`
     - Transforma respuesta de Lemonway
     - Inserta en `movimientos_cuenta`
  4. Actualiza estadísticas del run
  5. Cambia status a `'completed'` o `'failed'`

### 3. Transformación de Datos

**Respuesta de Lemonway:**
\`\`\`json
{
  "accountId": "WALLET123",
  "transactions": [{
    "transactionId": "TXN001",
    "transactionIn": {
      "creditAmount": 10000,
      "typeLabel": "Money In",
      "date": 1705320000,
      "comment": "Initial deposit"
    }
  }]
}
\`\`\`

**Guardado en `movimientos_cuenta`:**
\`\`\`sql
INSERT INTO lemonway_temp.movimientos_cuenta (
  cuenta_virtual_id,          -- Mapeado desde cuentas_virtuales
  lemonway_transaction_id,    -- transactionId
  tipo_operacion_id,          -- TODO: mapear desde typeLabel
  fecha_operacion,            -- FROM_UNIXTIME(date)
  importe,                    -- creditAmount / 100
  descripcion,                -- comment
  datos_originales_lemonway   -- JSON completo
) VALUES (...);
\`\`\`

## Modelo de Datos

### Schema: `lemonway_temp`

#### 1. `import_runs`
\`\`\`sql
id                UUID PRIMARY KEY
cuenta_virtual_id UUID (opcional - para imports de 1 cuenta)
status            VARCHAR (pending, processing, completed, failed)
total_accounts    INTEGER
processed_accounts INTEGER
total_transactions INTEGER
imported_transactions INTEGER
failed_transactions INTEGER
error_message     TEXT
started_at        TIMESTAMPTZ
completed_at      TIMESTAMPTZ
\`\`\`

#### 2. `cuentas_virtuales`
Mapeo de cuentas virtuales del sistema con wallets de Lemonway.

\`\`\`sql
id                      UUID PRIMARY KEY
cuenta_virtual_id       UUID REFERENCES VirtualAccount(id)
lemonway_account_id     VARCHAR (el accountId de Lemonway)
investor_id             TEXT (opcional)
vinculado_en            TIMESTAMPTZ
activo                  BOOLEAN
\`\`\`

#### 3. `tipos_operacion_contable`
Catálogo de tipos de operación contable.

\`\`\`sql
id          UUID PRIMARY KEY
codigo      VARCHAR(50) UNIQUE
nombre      VARCHAR(255)
descripcion TEXT
activo      BOOLEAN
\`\`\`

**Tipos por defecto:**
- `INGRESO` - Ingreso de fondos
- `RETIRO` - Retiro de fondos
- `TRANSFERENCIA_ENTRADA` - Transferencia recibida
- `TRANSFERENCIA_SALIDA` - Transferencia enviada
- `OTRO` - Otro tipo de operación

#### 4. `movimientos_cuenta`
Transacciones importadas desde Lemonway.

\`\`\`sql
id                         UUID PRIMARY KEY
import_run_id              UUID REFERENCES import_runs
cuenta_virtual_id          UUID REFERENCES cuentas_virtuales
lemonway_transaction_id    VARCHAR UNIQUE
tipo_operacion_id          UUID REFERENCES tipos_operacion_contable
fecha_operacion            TIMESTAMPTZ
importe                    DECIMAL(15,2)
descripcion                TEXT
saldo_previo               DECIMAL(15,2) -- TODO: calcular
saldo_posterior            DECIMAL(15,2) -- TODO: calcular
estado_revision            VARCHAR (pendiente, revisado, aprobado, rechazado)
revisado_por               TEXT
revisado_en                TIMESTAMPTZ
datos_originales_lemonway  JSONB
\`\`\`

## APIs REST

### 1. Iniciar Importación
\`\`\`http
POST /api/lemonway/imports/start
Content-Type: application/json

{
  "cuentaVirtualId": "uuid-opcional"  // Si se omite, importa todas
}

Response 201:
{
  "runId": "uuid",
  "status": "pending",
  "message": "Importación iniciada. Se procesará en segundo plano."
}
\`\`\`

**Permisos:** `lemonway_imports:start`

### 2. Listar Importaciones
\`\`\`http
GET /api/lemonway/imports?page=1&limit=20&status=completed

Response 200:
{
  "runs": [{
    "id": "uuid",
    "status": "completed",
    "totalTransactions": 150,
    "importedTransactions": 150,
    "startedAt": "2024-01-15T10:00:00Z",
    "completedAt": "2024-01-15T10:05:00Z"
  }],
  "total": 50,
  "page": 1,
  "limit": 20
}
\`\`\`

**Permisos:** `lemonway_imports:view`

### 3. Detalle de Importación
\`\`\`http
GET /api/lemonway/imports/{runId}

Response 200:
{
  "id": "uuid",
  "status": "completed",
  "totalAccounts": 10,
  "processedAccounts": 10,
  "totalTransactions": 150,
  "importedTransactions": 145,
  "failedTransactions": 5,
  "startedAt": "2024-01-15T10:00:00Z",
  "completedAt": "2024-01-15T10:05:00Z",
  "transactions": [...]
}
\`\`\`

**Permisos:** `lemonway_imports:view`

### 4. Reintentar Importación
\`\`\`http
POST /api/lemonway/imports/{runId}/retry

Response 200:
{
  "message": "Importación reintentada",
  "runId": "uuid",
  "status": "pending"
}
\`\`\`

**Permisos:** `lemonway_imports:retry`

### 5. Listar Movimientos Temporales
\`\`\`http
GET /api/lemonway/temp-movimientos?page=1&limit=50&estado=pendiente

Response 200:
{
  "movimientos": [{
    "id": "uuid",
    "cuentaVirtualId": "uuid",
    "transactionId": "TXN001",
    "fechaOperacion": "2024-01-15T10:00:00Z",
    "importe": 100.00,
    "tipoOperacion": "INGRESO",
    "estadoRevision": "pendiente"
  }],
  "total": 150,
  "page": 1,
  "limit": 50
}
\`\`\`

**Permisos:** `lemonway_temp:view`

### 6. Editar Movimiento Temporal
\`\`\`http
PATCH /api/lemonway/temp-movimientos/{id}
Content-Type: application/json

{
  "tipoOperacionId": "uuid",
  "descripcion": "Descripción actualizada"
}

Response 200:
{
  "message": "Movimiento actualizado",
  "movimiento": {...}
}
\`\`\`

**Permisos:** `lemonway_temp:edit`

## Componentes UI

### 1. `/dashboard/lemonway/imports`
**Funcionalidad:**
- Botón "Nueva Importación" (abre diálogo)
- Tabla con historial de importaciones
- Columnas: Fecha, Estado, Cuentas, Transacciones, Duración, Acciones
- Auto-refresh cada 30s para runs en proceso
- Click en row → navega a detalle

### 2. `/dashboard/lemonway/imports/[runId]`
**Funcionalidad:**
- Resumen del run (estadísticas)
- Badge de estado (pending/processing/completed/failed)
- Tabla de transacciones importadas
- Botón "Reintentar" si falló
- Logs de errores si los hay

### 3. `/dashboard/lemonway/temp-movimientos`
**Funcionalidad:**
- Tabla de movimientos temporales
- Filtros: Estado revisión, Tipo operación, Cuenta, Fechas
- Búsqueda por ID transacción o descripción
- Click en row → abre diálogo de edición
- Selección múltiple para aprobar en batch
- Botón "Aprobar seleccionados"

## Permisos RBAC

| Permiso | Resource | Action | Descripción | Roles |
|---------|----------|--------|-------------|-------|
| `lemonway_imports:view` | lemonway_imports | view | Ver historial de importaciones | superadmin, admin |
| `lemonway_imports:start` | lemonway_imports | start | Iniciar nuevas importaciones | superadmin, admin |
| `lemonway_imports:retry` | lemonway_imports | retry | Reintentar importaciones fallidas | superadmin |
| `lemonway_temp:view` | lemonway_temp | view | Ver movimientos temporales | superadmin, admin |
| `lemonway_temp:edit` | lemonway_temp | edit | Editar movimientos | superadmin, admin |
| `lemonway_temp:approve` | lemonway_temp | approve | Aprobar y migrar a definitivo | superadmin |

## Consideraciones Técnicas

### Mapeo de Cuentas
- Se usa la tabla `lemonway_temp.cuentas_virtuales`
- El mapeo se hace a través de `lemonway_account_id`
- Solo se importan transacciones de cuentas vinculadas

### Manejo de Duplicados
- `lemonway_transaction_id` es UNIQUE
- Si ya existe, se hace UPSERT actualizando datos
- Permite re-importar sin duplicados

### Procesamiento Asíncrono
- Worker se ejecuta cada 2 minutos via cron
- Procesa máximo 5 runs simultáneos
- Timeout de 5 minutos por run
- Si falla, marca como 'failed' con error_message

### Estados de Revisión
- **pendiente**: Recién importado, sin revisar
- **revisado**: Usuario lo revisó pero no aprobó
- **aprobado**: Listo para migrar a contabilidad
- **rechazado**: No se migrará

## Próximos Pasos (TODOs)

1. **Mapeo de Tipos de Operación**
   - Crear lógica para mapear `typeLabel` de Lemonway a `tipo_operacion_id`
   - Puede ser tabla de mapeo o switch/case

2. **Cálculo de Saldos**
   - Implementar cálculo de `saldo_previo` y `saldo_posterior`
   - Basado en orden cronológico de transacciones

3. **Migración a Definitivo**
   - Crear proceso para migrar movimientos aprobados
   - Mover de `lemonway_temp` a tablas definitivas

4. **Notificaciones**
   - Enviar email cuando importación completa
   - Notificar si hay errores

## Seguridad

- Todas las APIs requieren autenticación
- Permisos RBAC granulares por operación
- Logs de auditoría en cada acción
- Datos sensibles en JSONB encriptado

## Monitoreo

- Dashboard muestra estadísticas en tiempo real
- Logs del worker en base de datos
- Métricas: tiempo de procesamiento, tasa de éxito, errores comunes

## ESTADO ACTUAL Y PROBLEMAS CRÍTICOS

### Problema Principal: Transacciones No Aparecen en Dashboard

**Síntoma:** Las importaciones se marcan como "completed" pero las transacciones no aparecen en `/dashboard/lemonway/temp-movimientos`.

**Causa Raíz:** El formato de fechas enviado a Lemonway API.

### Requerimiento Crítico de Lemonway API

**⚠️ IMPORTANTE:** Lemonway API requiere timestamps Unix (números enteros) para las fechas, NO strings ISO.

\`\`\`javascript
// ❌ INCORRECTO
GET /accounts/125/transactions?startDate=2026-01-01&endDate=2026-01-31

// ✅ CORRECTO
GET /accounts/125/transactions?startDate=1735689600&endDate=1769817600
\`\`\`

**Mensaje de Error de Lemonway:**
\`\`\`json
{
  "code": 234,
  "message": "The field StartDate must match the regular expression '^-?\\d{1,12}$'."
}
\`\`\`

La regex `'^-?\\d{1,12}$'` significa: número entero de hasta 12 dígitos, opcionalmente negativo.

### Componentes Afectados

#### 1. `lib/lemonway-client.ts` - Método `getAccountTransactions`
**Ubicación:** Líneas ~1055-1150

**Problema Actual:**
\`\`\`typescript
// Envía strings ISO
queryParams.append("startDate", startDate.split("T")[0]); 
\`\`\`

**Solución Requerida:**
\`\`\`typescript
// Convertir a timestamp Unix (segundos)
const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
queryParams.append("startDate", startTimestamp.toString());
\`\`\`

#### 2. `lib/workers/lemonway-import-worker.ts`
**Ubicación:** Líneas ~40-80

**Estado Actual:** Guarda directamente en `movimientos_cuenta` sin pasar por cola de reintentos.

**Flujo:**
1. Obtiene `import_runs` con `status: 'pending'`
2. Llama `lemonwayClient.getAccountTransactions(accountId, startDate, endDate)`
3. Por cada transacción, llama `repository.createMovimiento()`
4. Actualiza estadísticas en `import_runs`

#### 3. `app/api/lemonway-api/test/route.ts` - API Explorer
**Problema:** También envía fechas en formato incorrecto.

### Archivos Clave a Revisar/Modificar

\`\`\`
lib/
├── lemonway-client.ts           # Método getAccountTransactions (líneas 1055-1150)
├── workers/
│   └── lemonway-import-worker.ts  # Procesamiento asíncrono (líneas 1-200)
└── repositories/
    └── lemonway-imports-repository.ts  # Métodos CRUD

app/api/
├── lemonway-api/
│   └── test/route.ts            # API Explorer (necesita misma corrección)
├── lemonway/
│   ├── imports/
│   │   ├── route.ts             # GET lista de imports
│   │   ├── start/route.ts       # POST crear import
│   │   └── [runId]/
│   │       ├── route.ts         # GET detalle de import
│   │       └── retry/route.ts   # POST reintentar import
│   └── temp-movimientos/
│       └── route.ts             # GET/PATCH movimientos temporales

components/lemonway/
├── imports-list.tsx             # Lista de importaciones
├── import-detail.tsx            # Detalle de importación
└── temp-movimientos-list.tsx    # Lista de movimientos temporales

scripts/
└── 139-create-lemonway-import-schema.sql  # Schema de BD
\`\`\`

### Plan de Corrección

#### Paso 1: Corregir `lemonway-client.ts`
\`\`\`typescript
// En getAccountTransactions (línea ~1090)
async getAccountTransactions(
  accountId: string,
  startDate?: string,  // Puede ser ISO: "2026-01-01"
  endDate?: string,
  ...otherParams
): Promise<any> {
  const queryParams = new URLSearchParams();
  
  if (startDate && typeof startDate === 'string') {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    queryParams.append("startDate", startTimestamp.toString());
  }
  
  if (endDate && typeof endDate === 'string') {
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);
    queryParams.append("endDate", endTimestamp.toString());
  }
  
  const url = `${this.baseUrl}/accounts/${accountId}/transactions/?${queryParams}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: this.getHeaders(),
    // ⚠️ NO body en GET
  });
  
  return response.json();
}
\`\`\`

#### Paso 2: Verificar Worker
El worker ya está llamando correctamente con fechas ISO (strings). El cliente las convertirá a timestamps.

#### Paso 3: Corregir API Explorer
Aplicar la misma lógica en `app/api/lemonway-api/test/route.ts`.

#### Paso 4: Probar Flujo Completo
1. Crear nueva importación
2. Verificar que worker llama a Lemonway con timestamps correctos
3. Confirmar que transacciones se guardan en `movimientos_cuenta`
4. Verificar que aparecen en dashboard

### Otros Problemas Identificados

#### 1. Mapeo de `cuenta_virtual_id`
**Problema:** El worker no tiene forma de mapear `lemonway_account_id` a `cuenta_virtual_id` del sistema.

**Solución Temporal:** Usar `account_id` como `cuentaVirtualId`.

**Solución Definitiva:** Crear/poblar tabla `lemonway_temp.cuentas_virtuales` con mapeo.

#### 2. Sistema de Reintentos (LemonwayApiCallLog)
**Estado:** Implementado pero no se está usando en el flujo de importaciones.

**Decisión:** Por ahora, guardar directamente. El sistema de reintentos es para otras operaciones críticas.

### Comandos Útiles para Debugging

\`\`\`sql
-- Ver última importación
SELECT * FROM lemonway_temp.import_runs ORDER BY created_at DESC LIMIT 1;

-- Contar transacciones de una importación
SELECT COUNT(*) FROM lemonway_temp.movimientos_cuenta 
WHERE import_run_id = 'tu-run-id-aqui';

-- Ver logs de errores
SELECT id, error_message, created_at 
FROM lemonway_temp.import_runs 
WHERE status = 'failed' 
ORDER BY created_at DESC;

-- Ver transacciones recientes
SELECT * FROM lemonway_temp.movimientos_cuenta 
ORDER BY created_at DESC LIMIT 10;
