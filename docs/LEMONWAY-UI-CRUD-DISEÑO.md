# UI CRUD para Administración de Configuración Lemonway

## 1. VISIÓN GENERAL Y OBJETIVOS

### 1.1 Propósito

Crear un panel administrativo completo para gestionar:
- **Configuración global** de conexión a Lemonway (environment, tokens, rate limiting)
- **Métodos disponibles** (endpoints, esquemas JSON, ejemplos)
- **Queries personalizadas** (consultas reutilizables)
- **Configuración de importación** (tipos de operación, mapeos de campos)
- **Reintentos y manejo de errores** (políticas de retry, límites)

### 1.2 Usuarios Objetivo

- **SuperAdmin**: Acceso total, puede modificar configuración crítica
- **Admin Lemonway**: Acceso a métodos, queries, importación
- **ViewOnly**: Solo lectura para auditoría

---

## 2. ESTRUCTURA DE DATOS A GESTIONAR

### 2.1 Entidades Principales

```
┌─────────────────────────────────────────────────────────┐
│ LEMONWAY MANAGEMENT SYSTEM                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1. LemonwayConfig                                       │
│     ├─ environment (sandbox/production)                 │
│     ├─ api_token                                         │
│     ├─ wallet_id                                         │
│     ├─ max_concurrent_requests                          │
│     ├─ min_delay_between_requests_ms                    │
│     └─ webhook_secret                                    │
│                                                           │
│  2. LemonwayApiMethod                                    │
│     ├─ id (unique identifier)                           │
│     ├─ name                                              │
│     ├─ endpoint                                          │
│     ├─ http_method (GET/POST/PUT/DELETE)               │
│     ├─ category (AUTH/ACCOUNTS/TRANSACTIONS/KYC)       │
│     ├─ request_schema (JSON Schema)                     │
│     ├─ response_schema (JSON Schema)                    │
│     ├─ example_request                                   │
│     └─ example_response                                  │
│                                                           │
│  3. LemonwayQuery (tabla a crear)                        │
│     ├─ id (unique identifier)                           │
│     ├─ name                                              │
│     ├─ description                                       │
│     ├─ method_id (FK a LemonwayApiMethod)              │
│     ├─ parameters (JSONB)                               │
│     ├─ is_template (reutilizable)                      │
│     ├─ usage_count                                       │
│     └─ last_used_at                                      │
│                                                           │
│  4. LemonwayRetryConfig (tabla a crear)                 │
│     ├─ id                                                │
│     ├─ name                                              │
│     ├─ max_retries                                       │
│     ├─ initial_delay_ms                                 │
│     ├─ backoff_multiplier                               │
│     ├─ max_delay_ms                                      │
│     └─ applicable_status_codes                          │
│                                                           │
│  5. LemonwayOperationType (tabla a crear)                │
│     ├─ id                                                │
│     ├─ codigo                                            │
│     ├─ nombre                                            │
│     ├─ categoria                                         │
│     ├─ lemonway_transaction_type                        │
│     ├─ requiere_aprobacion                              │
│     └─ is_active                                         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 3. ARQUITECTURA DE UI

### 3.1 Navegación Principal (Dashboard)

```
┌─────────────────────────────────────────────────────────┐
│ URBIX - Configuración Lemonway                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Sidebar:                          Main Content:         │
│ ├─ Dashboard                      ┌──────────────────┐  │
│ ├─ Configuración                  │ Stats Cards:     │  │
│ ├─ Métodos API                    ├──────────────────┤  │
│ ├─ Queries Personalizadas         │ • Environment    │  │
│ ├─ Tipos de Operación             │ • API Token OK   │  │
│ ├─ Reintentos                     │ • Last Sync      │  │
│ ├─ Logs & Auditoría               │ • Methods Count  │  │
│ └─ Webhooks                       └──────────────────┘  │
│                                                           │
│                                  Quick Actions:         │
│                                  • Test Connection     │
│                                  • Import Methods      │
│                                  • View API Docs       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 4. SECCIONES DETALLADAS

### 4.1 SECCIÓN 1: CONFIGURACIÓN GLOBAL

**Ruta:** `/dashboard/admin/lemonway/config`

**Componentes:**

```
┌──────────────────────────────────────────────────────────┐
│ Configuración Lemonway                       [Edit] [Save]│
├──────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ Ambiente ────────────────────────────────────┐        │
│ │ Environment: [Sandbox ▼] [Production ▼]       │        │
│ │ Status: ✓ Conectado (Última sincronización: hoy) │    │
│ └────────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Autenticación ────────────────────────────────┐        │
│ │ API Token: [••••••••••••••••••] [Show] [Copy]  │        │
│ │ Wallet ID: [••••••••••••••••••] [Copy]         │        │
│ │ Webhook Secret: [••••••••••] [Regenerar]       │        │
│ └────────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Rate Limiting ────────────────────────────────┐        │
│ │ Max Concurrent Requests: [3] (validado: 1-10) │        │
│ │ Min Delay (ms): [1000] (validado: 100-5000)   │        │
│ │ Queue Strategy: [FIFO ▼]                       │        │
│ └────────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Información de Empresa ───────────────────────┐        │
│ │ Nombre: [URBIX Ltd]                            │        │
│ │ Website: [urbix.es]                            │        │
│ │ Account ID: [••••••••••]                       │        │
│ └────────────────────────────────────────────────┘        │
│                                                            │
│ [Prueba Conexión] [Ver Logs] [Restaurar Defecto]         │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ Ver/editar configuración actual
- ✅ Test Connection (llamada GET /users/WhoAmI)
- ✅ Mostrar/ocultar tokens sensibles
- ✅ Copiar valores al portapapeles
- ✅ Historial de cambios
- ✅ Validación antes de guardar
- ✅ Confirmación para cambios críticos

---

### 4.2 SECCIÓN 2: MÉTODOS API

**Ruta:** `/dashboard/admin/lemonway/methods`

**Componentes:**

```
┌──────────────────────────────────────────────────────────┐
│ Métodos Disponibles                     [+ Nuevo] [Importar]│
├──────────────────────────────────────────────────────────┤
│                                                            │
│ Filtros: [Categoría ▼] [Estado ▼] [Búsqueda...]         │
│                                                            │
│ ┌─ Tabla de Métodos ────────────────────────────────┐    │
│ │ ID              │ Nombre              │ Categoría │    │
│ ├─────────────────┼─────────────────────┼───────────┤    │
│ │ GetWalletTrans  │ Get Wallet Trans.   │ TRANS     │    │
│ │ UpdateWalletDtl │ Update Wallet Deta. │ ACCOUNT   │    │
│ │ GetBalance      │ Get Balance         │ ACCOUNT   │    │
│ │ UpdateKYCStatus │ Update KYC Status   │ KYC       │    │
│ └─────────────────┴─────────────────────┴───────────┘    │
│                                                            │
│ [Vista Tabla] [Vista Tarjetas]                           │
│                                                            │
└──────────────────────────────────────────────────────────┘

Al hacer click en un método:

┌──────────────────────────────────────────────────────────┐
│ GetWalletTransactions                      [Edit] [Delete]│
├──────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ Información Básica ──────────────────────────┐        │
│ │ ID: GetWalletTransactions                     │        │
│ │ Nombre: Get Wallet Transactions               │        │
│ │ Descripción: Retrieves wallet transactions    │        │
│ │ Categoría: TRANSACTIONS [▼]                   │        │
│ │ HTTP Method: [GET ▼]                          │        │
│ │ Endpoint: [/transactions/GetWalletTransactions│        │
│ │ Habilitado: [✓]                               │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Request Schema (JSON) ───────────────────────┐        │
│ │ {                                              │        │
│ │   "type": "object",                            │        │
│ │   "properties": {                              │        │
│ │     "startDate": {"type": "string"},           │        │
│ │     "endDate": {"type": "string"}              │        │
│ │   }                                            │        │
│ │ }                                              │        │
│ │ [Validar Schema]                               │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Response Schema (JSON) ──────────────────────┐        │
│ │ {                                              │        │
│ │   "type": "object",                            │        │
│ │   "properties": {                              │        │
│ │     "transactionIn": {"type": "array"}         │        │
│ │   }                                            │        │
│ │ }                                              │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Ejemplo Request ─────────────────────────────┐        │
│ │ {"startDate": "2025-01-01", "endDate": "..."}│        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Ejemplo Response ────────────────────────────┐        │
│ │ {"transactionIn": [{...}, {...}, ...]}       │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ [Prueba Llamada] [Copiar Schema] [Historial]            │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ Tabla paginada con búsqueda/filtrado
- ✅ Crear nuevo método manual
- ✅ Importar métodos desde Lemonway API
- ✅ Editar método existente
- ✅ Visualización de esquema JSON (con editor visual)
- ✅ Validación de esquemas JSON
- ✅ Prueba de llamada (test endpoint)
- ✅ Ver ejemplos request/response
- ✅ Historial de cambios
- ✅ Estadísticas de uso

---

### 4.3 SECCIÓN 3: QUERIES PERSONALIZADAS

**Ruta:** `/dashboard/admin/lemonway/queries`

**Componentes:**

```
┌──────────────────────────────────────────────────────────┐
│ Queries Personalizadas              [+ Nueva] [Importar Template]│
├──────────────────────────────────────────────────────────┤
│                                                            │
│ Filtros: [Método ▼] [Template ▼] [Usado/No Usado] [Búsqueda...]│
│                                                            │
│ ┌─ Tabla de Queries ────────────────────────────────────┐│
│ │ Nombre        │ Método        │ Parámetros │ Uso │    ││
│ ├───────────────┼───────────────┼────────────┼─────┤    ││
│ │ Trans Enero   │ GetWalletTr.  │ 5 params   │ 23  │    ││
│ │ Balance Hoy   │ GetBalance    │ 2 params   │ 15  │    ││
│ │ KYC Check     │ UpdateKYCStatus│ 3 params  │ 3   │    ││
│ └───────────────┴───────────────┴────────────┴─────┘    ││
│                                                            │
│ [Vista Tabla] [Vista Kanban]                             │
│                                                            │
└──────────────────────────────────────────────────────────┘

Al hacer click en una query:

┌──────────────────────────────────────────────────────────┐
│ Get Transactions Enero 2025            [Edit] [Duplicate] [Delete]│
├──────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ Información ─────────────────────────────────┐        │
│ │ ID: trans-enero-2025                          │        │
│ │ Nombre: Get Transactions Enero 2025           │        │
│ │ Descripción: Récupère les transactions...     │        │
│ │ Template Reutilizable: [✓]                    │        │
│ │ Método: [GetWalletTransactions ▼]            │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Parámetros ──────────────────────────────────┐        │
│ │ ┌─ Parámetro 1 ────────────────────────────┐  │        │
│ │ │ Nombre: startDate                        │  │        │
│ │ │ Tipo: [string ▼]                        │  │        │
│ │ │ Requerido: [✓]                           │  │        │
│ │ │ Valor por Defecto: 2025-01-01            │  │        │
│ │ │ Descripción: Fecha inicial               │  │        │
│ │ │ Validación: [Mostrar]                    │  │        │
│ │ │ [Remover]                                │  │        │
│ │ └────────────────────────────────────────────┘  │        │
│ │                                                  │        │
│ │ ┌─ Parámetro 2 ────────────────────────────┐  │        │
│ │ │ Nombre: endDate                          │  │        │
│ │ │ Tipo: [string ▼]                        │  │        │
│ │ │ Requerido: [✓]                           │  │        │
│ │ │ Valor por Defecto: 2025-01-31            │  │        │
│ │ │ Descripción: Fecha final                 │  │        │
│ │ │ Validación: [Mostrar]                    │  │        │
│ │ │ [Remover]                                │  │        │
│ │ └────────────────────────────────────────────┘  │        │
│ │                                                  │        │
│ │ [+ Agregar Parámetro]                          │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Request Generado ────────────────────────┐            │
│ │ {                                          │            │
│ │   "startDate": "2025-01-01",               │            │
│ │   "endDate": "2025-01-31"                  │            │
│ │ }                                          │            │
│ │ [Copiar] [Validar]                        │            │
│ └────────────────────────────────────────────┘            │
│                                                            │
│ ┌─ Ejecuciones Recientes ───────────────────┐            │
│ │ • 2025-01-12 10:45 - Exitosa (234 txn)  │            │
│ │ • 2025-01-12 09:30 - Exitosa (189 txn)  │            │
│ │ • 2025-01-11 16:20 - Fallida (timeout)  │            │
│ │ [Ver Historial Completo]                 │            │
│ └────────────────────────────────────────────┘            │
│                                                            │
│ [Prueba Query] [Guardar] [Cancelar]                     │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ Tabla paginada con búsqueda/filtrado
- ✅ Crear nueva query desde cero
- ✅ Duplicar query existente (plantilla)
- ✅ Selector dinámico de método
- ✅ Constructor visual de parámetros
- ✅ Validación de tipos de parámetros
- ✅ Vista previa de request JSON
- ✅ Prueba de ejecución
- ✅ Historial de ejecuciones
- ✅ Marcar como template reutilizable
- ✅ Estadísticas de uso

---

### 4.4 SECCIÓN 4: TIPOS DE OPERACIÓN

**Ruta:** `/dashboard/admin/lemonway/operation-types`

**Componentes:**

```
┌──────────────────────────────────────────────────────────┐
│ Tipos de Operación                      [+ Nuevo] [Importar]│
├──────────────────────────────────────────────────────────┤
│                                                            │
│ Filtros: [Categoría ▼] [Estado ▼] [Requiere Aprobación ▼]│
│                                                            │
│ ┌─ Tabla de Tipos ──────────────────────────────────┐    │
│ │ Código │ Nombre │ Categoría │ Requiere Aprob. │   ││
│ ├────────┼────────┼───────────┼─────────────────┤    ││
│ │ ING001 │ Depósito│ ingreso  │ No              │    ││
│ │ EGR001 │ Retiro │ egreso   │ Sí              │    ││
│ │ TRF001 │ Trans. │ transf.  │ No              │    ││
│ └────────┴────────┴───────────┴─────────────────┘    ││
│                                                            │
└──────────────────────────────────────────────────────────┘

Detalle al hacer click:

┌──────────────────────────────────────────────────────────┐
│ Tipo de Operación: EGR001                   [Edit] [Delete]│
├──────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ Información ─────────────────────────────────┐        │
│ │ Código: [EGR001]                              │        │
│ │ Nombre: [Retiro]                              │        │
│ │ Descripción: Retiro de fondos                 │        │
│ │ Categoría: [egreso ▼]                        │        │
│ │ Activo: [✓]                                   │        │
│ │ Requiere Aprobación: [✓]                      │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Mapeo Lemonway ──────────────────────────────┐        │
│ │ Tipo de Transacción Lemonway: [DEBIT ▼]     │        │
│ │ Patrón Comentario: [.*retiro.*]              │        │
│ │ Métodos de Pago: [Wire ▼] [Card ▼] [ACH ▼] │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Configuración de Aprobación ─────────────────┐        │
│ │ Requerida Aprobación: [✓]                     │        │
│ │ Aprobadores: [Admin, Manager]                 │        │
│ │ Límite Automático: €[5000]                    │        │
│ │  (Sobre este límite, requiere aprobación)    │        │
│ │ Días de Aprobación: [5] días máximo          │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Estadísticas ────────────────────────────────┐        │
│ │ Total Operaciones: 245                        │        │
│ │ Pendientes Aprobación: 12                     │        │
│ │ Últimas 30 Días: 67                           │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ [Guardar] [Cancelar]                                     │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ CRUD de tipos de operación
- ✅ Mapeo a tipos Lemonway
- ✅ Patrones regex para comentarios
- ✅ Configuración de aprobación
- ✅ Límites automáticos por cantidad
- ✅ Auditoría de cambios
- ✅ Estadísticas de uso

---

### 4.5 SECCIÓN 5: POLÍTICA DE REINTENTOS

**Ruta:** `/dashboard/admin/lemonway/retry-config`

**Componentes:**

```
┌──────────────────────────────────────────────────────────┐
│ Políticas de Reintento                    [+ Nueva] [Clonar]│
├──────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ Tabla de Políticas ──────────────────────────────┐    │
│ │ Nombre          │ Max Reintentos │ Delay Inicial │    ││
│ ├─────────────────┼────────────────┼──────────────┤    ││
│ │ Default         │ 5              │ 1000ms       │    ││
│ │ Critical        │ 10             │ 500ms        │    ││
│ │ Lenient         │ 2              │ 5000ms       │    ││
│ └─────────────────┴────────────────┴──────────────┘    ││
│                                                            │
└──────────────────────────────────────────────────────────┘

Detalle:

┌──────────────────────────────────────────────────────────┐
│ Política: Default                      [Edit] [Delete]    │
├──────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ Configuración Base ──────────────────────────┐        │
│ │ Nombre: [Default]                             │        │
│ │ Descripción: Política estándar de reintentos │        │
│ │ Máximos Reintentos: [5]                       │        │
│ │ Backoff Strategy: [exponential ▼]            │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Timing ──────────────────────────────────────┐        │
│ │ Initial Delay (ms): [1000]                    │        │
│ │ Max Delay (ms): [30000]                       │        │
│ │ Backoff Multiplier: [2.0]                     │        │
│ │ Jitter: [0-100ms]                             │        │
│ │                                                │        │
│ │ Timeline Previeww:                            │        │
│ │ • Reintento 1: 1000ms (1s)                   │        │
│ │ • Reintento 2: 2000ms (2s)                   │        │
│ │ • Reintento 3: 4000ms (4s)                   │        │
│ │ • Reintento 4: 8000ms (8s)                   │        │
│ │ • Reintento 5: 16000ms (16s)                 │        │
│ │ Total Time: 31s                               │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Status Codes a Reintentar ────────────────────┐        │
│ │ [✓] 429 (Too Many Requests)                    │        │
│ │ [✓] 500 (Internal Server Error)                │        │
│ │ [✓] 502 (Bad Gateway)                          │        │
│ │ [✓] 503 (Service Unavailable)                  │        │
│ │ [✓] 504 (Gateway Timeout)                      │        │
│ │ [ ] 400 (Bad Request)                          │        │
│ │ [ ] 401 (Unauthorized)                         │        │
│ │ [ ] 403 (Forbidden)                            │        │
│ │ [ ] 404 (Not Found)                            │        │
│ └────────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Excepciones ─────────────────────────────────┐        │
│ │ [+ Agregar Exception]                          │        │
│ │                                                 │        │
│ │ Exception: timeout                             │        │
│ │ Max Reintentos Override: 10                    │        │
│ │ Initial Delay Override: 500ms                  │        │
│ │ [Remover]                                      │        │
│ └────────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Métodos que Usan Esta Política ──────────────┐        │
│ │ • GetWalletTransactions                        │        │
│ │ • GetBalance                                   │        │
│ │ • UpdateKYCStatus                              │        │
│ │ [Ver Todos (12)]                               │        │
│ └────────────────────────────────────────────────┘        │
│                                                            │
│ [Guardar] [Cancelar]                                     │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ CRUD de políticas de reintento
- ✅ Cálculo visual de backoff
- ✅ Selector de status codes
- ✅ Excepciones personalizadas
- ✅ Vista de métodos usando la política
- ✅ Prueba de timing

---

### 4.6 SECCIÓN 6: LOGS Y AUDITORÍA

**Ruta:** `/dashboard/admin/lemonway/logs`

**Componentes:**

```
┌──────────────────────────────────────────────────────────┐
│ Logs & Auditoría de Lemonway           [Exportar] [Filtros]│
├──────────────────────────────────────────────────────────┤
│                                                            │
│ Filtros Avanzados:                                        │
│ [Método ▼] [Status ▼] [Fecha Desde ▼] [Fecha Hasta ▼]   │
│ [Búsqueda...] [Aplicar]                                 │
│                                                            │
│ ┌─ Tabla de Logs ───────────────────────────────────┐    │
│ │ Timestamp │ Método │ Status │ Tiempo │ Reintentos│    ││
│ ├───────────┼────────┼────────┼────────┼───────────┤    ││
│ │ 10:45 ✓   │ GetTxn │ 200    │ 234ms  │ 0        │    ││
│ │ 10:42 ✓   │ GetBal │ 200    │ 145ms  │ 1        │    ││
│ │ 10:40 ✗   │ GetKYC │ 503    │ 5003ms │ 2/5      │    ││
│ │ 09:30 ✓   │ GetTxn │ 200    │ 289ms  │ 0        │    ││
│ └───────────┴────────┴────────┴────────┴───────────┘    ││
│                                                            │
│ Pagination: [◄] 1 de 523 [►]                            │
│                                                            │
└──────────────────────────────────────────────────────────┘

Al hacer click en un log:

┌──────────────────────────────────────────────────────────┐
│ Detalle de Llamada: 10:40 - GetKYCStatus [Error]        │
├──────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ Información ─────────────────────────────────┐        │
│ │ Timestamp: 2025-01-12 10:40:33.234 UTC        │        │
│ │ Método: UpdateKYCStatus                       │        │
│ │ Status Code: 503 (Service Unavailable)       │        │
│ │ Tiempo Total: 5003ms                          │        │
│ │ Reintentos: 2 de 5                            │        │
│ │ Usuario: admin@urbix.es                       │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Request ─────────────────────────────────────┐        │
│ │ Headers:                                       │        │
│ │ Authorization: Bearer ••••••••••              │        │
│ │ Content-Type: application/json                │        │
│ │                                                │        │
│ │ Body:                                          │        │
│ │ {                                              │        │
│ │   "kycStatus": "VERIFIED",                    │        │
│ │   "verificationDate": "2025-01-12"            │        │
│ │ }                                              │        │
│ │ [Copiar] [Descargar]                          │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Response ────────────────────────────────────┐        │
│ │ Status: 503                                    │        │
│ │ Headers:                                       │        │
│ │ Content-Type: application/json                │        │
│ │ Retry-After: 30                               │        │
│ │                                                │        │
│ │ Body:                                          │        │
│ │ {                                              │        │
│ │   "error": "Service Temporarily Unavailable", │        │
│ │   "code": "503_SERVICE_UNAVAILABLE",          │        │
│ │   "message": "Lemonway API is under...        │        │
│ │ }                                              │        │
│ │ [Copiar] [Descargar]                          │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Historial de Reintentos ─────────────────────┐        │
│ │ Intento 1: 10:40:33 - 503 Service Unavailable│        │
│ │ Esperando 1000ms...                           │        │
│ │ Intento 2: 10:40:34 - 503 Service Unavailable│        │
│ │ Esperando 2000ms...                           │        │
│ │ Intento 3: SKIPPED (Max reached)              │        │
│ │                                                 │        │
│ │ Política Usada: Default (backoff exponential)│        │
│ │ [Ver Política]                                 │        │
│ └────────────────────────────────────────────────┘        │
│                                                            │
│ [Reintentar] [Cancelar]                                  │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ Tabla paginada con filtros avanzados
- ✅ Búsqueda full-text
- ✅ Exportación a CSV/JSON
- ✅ Detalle completo de llamada
- ✅ Request/response exacto
- ✅ Historial de reintentos
- ✅ Link a política de reintento
- ✅ Opción de reintento manual

---

### 4.7 SECCIÓN 7: WEBHOOKS

**Ruta:** `/dashboard/admin/lemonway/webhooks`

**Componentes:**

```
┌──────────────────────────────────────────────────────────┐
│ Webhooks Lemonway                    [Ver Configuración] │
├──────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─ Status del Webhook ──────────────────────────┐        │
│ │ Endpoint: https://urbix.es/api/webhooks/...  │        │
│ │ Estado: ✓ Activo                              │        │
│ │ Última Entrega: hace 2 minutos                │        │
│ │ Tasa Éxito (24h): 99.8%                      │        │
│ │ [Prueba Entrega] [Ver Logs]                   │        │
│ └───────────────────────────────────────────────┘        │
│                                                            │
│ ┌─ Tabla de Entregas Recientes ──────────────────┐       │
│ │ Timestamp │ Evento │ Wallet │ Status │ Tiempo │       ││
│ ├───────────┼────────┼────────┼────────┼────────┤       ││
│ │ 10:47 ✓   │ ACCNTX │ 12345  │ 200    │ 34ms   │       ││
│ │ 10:45 ✓   │ TRANSM │ 54321  │ 200    │ 56ms   │       ││
│ │ 10:43 ✗   │ ACCNTX │ 99999  │ 502    │ 5043ms │       ││
│ │ 10:40 ✓   │ TRANSM │ 11111  │ 200    │ 23ms   │       ││
│ └───────────┴────────┴────────┴────────┴────────┘       ││
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- ✅ Ver estado del webhook
- ✅ Tabla de entregas recientes
- ✅ Filtros por evento, wallet, status
- ✅ Prueba de entrega manual
- ✅ Logs detallados
- ✅ Resend de webhook fallido
- ✅ Estadísticas de tasa éxito

---

## 5. COMPONENTES REUTILIZABLES

### 5.1 Componentes de UI

```
LemonwayDashboard
├── ConfigSection
│   ├── EnvironmentSelector
│   ├── TokenInput
│   ├── RateLimitConfig
│   └── TestConnectionButton
├── MethodsSection
│   ├── MethodsTable
│   ├── MethodDetail
│   ├── SchemaEditor
│   ├── TestMethodButton
│   └── MethodImporter
├── QueriesSection
│   ├── QueriesTable
│   ├── QueryBuilder
│   ├── ParameterForm
│   ├── QueryTester
│   └── QueryHistory
├── OperationTypesSection
│   ├── OperationTypesTable
│   ├── OperationTypeForm
│   ├── LemonwayTypeMapper
│   └── ApprovalConfig
├── RetryPoliciesSection
│   ├── PoliciesTable
│   ├── PolicyForm
│   ├── BackoffVisualizer
│   ├── StatusCodeSelector
│   └── ExceptionOverrides
├── LogsSection
│   ├── LogsTable
│   ├── LogDetail
│   ├── AdvancedFilters
│   └── ExportButton
├── WebhooksSection
│   ├── WebhookStatus
│   ├── DeliveryTable
│   ├── TestDeliveryButton
│   └── ResendButton
└── SharedComponents
    ├── JsonEditor
    ├── ConfirmDialog
    ├── Toast
    ├── LoadingSpinner
    ├── ErrorBoundary
    └── AuditTrail
```

---

## 6. RUTAS Y ENDPOINTS REQUERIDOS

### 6.1 Backend Endpoints

```
GET/PUT  /api/admin/lemonway/config
GET/POST /api/admin/lemonway/methods
GET      /api/admin/lemonway/methods/:id
PUT      /api/admin/lemonway/methods/:id
DELETE   /api/admin/lemonway/methods/:id
POST     /api/admin/lemonway/methods/import-from-api
POST     /api/admin/lemonway/methods/:id/test

GET/POST /api/admin/lemonway/queries
GET      /api/admin/lemonway/queries/:id
PUT      /api/admin/lemonway/queries/:id
DELETE   /api/admin/lemonway/queries/:id
POST     /api/admin/lemonway/queries/:id/execute
POST     /api/admin/lemonway/queries/:id/duplicate

GET/POST /api/admin/lemonway/operation-types
GET      /api/admin/lemonway/operation-types/:id
PUT      /api/admin/lemonway/operation-types/:id
DELETE   /api/admin/lemonway/operation-types/:id

GET/POST /api/admin/lemonway/retry-configs
GET      /api/admin/lemonway/retry-configs/:id
PUT      /api/admin/lemonway/retry-configs/:id
DELETE   /api/admin/lemonway/retry-configs/:id

GET      /api/admin/lemonway/logs
GET      /api/admin/lemonway/logs/:id
POST     /api/admin/lemonway/logs/:id/retry

GET      /api/admin/lemonway/webhooks
GET      /api/admin/lemonway/webhooks/deliveries
POST     /api/admin/lemonway/webhooks/test-delivery
POST     /api/admin/lemonway/webhooks/:id/resend
```

---

## 7. FLUJOS DE USUARIO

### 7.1 Flujo: Crear Nueva Query

```
1. Usuario clica "+ Nueva"
2. Se abre modal de selección de método
3. Usuario selecciona "GetWalletTransactions"
4. Sistema carga schema del método (GET /api/admin/lemonway/methods/:id)
5. Formulario dinámico se renderiza con campos para cada parámetro
6. Usuario completa:
   - startDate: 2025-01-01
   - endDate: 2025-01-31
7. Usuario puede ver preview del JSON request
8. Usuario clica "Prueba Query"
9. Sistema ejecuta: POST /api/admin/lemonway/queries/:id/execute
10. Resultado se muestra en panel lateral
11. Usuario clica "Guardar"
12. Sistema guarda: POST /api/admin/lemonway/queries
13. Query aparece en tabla con ID generado
```

### 7.2 Flujo: Importar Métodos Desde API

```
1. Usuario clica "Importar" en sección Métodos
2. Se abre diálogo de confirmación
3. Usuario clica "Importar Ahora"
4. Sistema inicia: POST /api/admin/lemonway/methods/import-from-api
5. Barra de progreso muestra importación (0-100%)
6. Por cada método importado, tabla se actualiza en tiempo real
7. Cuando completa, se muestra resumen:
   - 12 métodos importados
   - 3 métodos actualizados
   - 0 errores
8. Usuario puede filtrar por "Recently Imported"
```

---

## 8. MODELO DE DATOS A CREAR

### 8.1 Nuevas Tablas SQL

```sql
-- Tabla: LemonwayQuery
CREATE TABLE public."LemonwayQuery" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  method_id VARCHAR(50) NOT NULL REFERENCES public."LemonwayApiMethod"(id),
  parameters JSONB NOT NULL DEFAULT '{}',
  is_template BOOLEAN DEFAULT false,
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMP,
  created_by TEXT REFERENCES public."User"(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: LemonwayRetryConfig
CREATE TABLE public."LemonwayRetryConfig" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_retries INT DEFAULT 5,
  initial_delay_ms INT DEFAULT 1000,
  backoff_multiplier DECIMAL(3,1) DEFAULT 2.0,
  max_delay_ms INT DEFAULT 30000,
  jitter_ms INT DEFAULT 100,
  applicable_status_codes INT[] DEFAULT '{429,500,502,503,504}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: LemonwayOperationType (expandida)
CREATE TABLE public."LemonwayOperationType" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(50) CHECK (categoria IN ('ingreso', 'egreso', 'transferencia', 'ajuste')),
  lemonway_transaction_type VARCHAR(50),
  lemonway_comment_pattern VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  requiere_aprobacion BOOLEAN DEFAULT false,
  limite_automatico_eur DECIMAL(15, 2),
  dias_aprobacion_max INT DEFAULT 5,
  aprobadores TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. CONSIDERACIONES DE SEGURIDAD

### 9.1 Protección de Datos Sensibles

- ✅ Tokens nunca se devuelven completos (solo últimos 4 caracteres)
- ✅ Tokens enmascarados con "•••" en UI
- ✅ Copia al portapapeles disponible (sin mostrar)
- ✅ Auditoría de todos los cambios de configuración
- ✅ Logs de acceso a datos sensibles
- ✅ Rate limiting en endpoints críticos

### 9.2 Validaciones

- ✅ Validación JSON Schema en cliente y servidor
- ✅ Validación de URLs/endpoints
- ✅ Sanitización de inputs
- ✅ CSRF protection en formularios
- ✅ API rate limiting por usuario

---

## 10. PRÓXIMOS PASOS

**Cuando se apruebe este diseño, se implementarán:**

1. ✅ Tablas SQL necesarias (scripts de migración)
2. ✅ Endpoints backend (API routes)
3. ✅ Componentes frontend (React components)
4. ✅ Formularios y validaciones
5. ✅ Integraciones con Lemonway API
6. ✅ Tests unitarios
7. ✅ Documentación de usuario

---

**Documento de Diseño UI/UX - v1.0**
