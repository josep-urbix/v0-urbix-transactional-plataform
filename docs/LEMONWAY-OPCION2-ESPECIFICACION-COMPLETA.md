# ESPECIFICACIÓN TÉCNICA Y FUNCIONAL COMPLETA
# OPCIÓN 2: Panel Administrativo Centralizado Lemonway

## TABLA DE CONTENIDOS

1. Visión General y Objetivos
2. Arquitectura de la Solución
3. Cambios en Base de Datos
4. Nuevos Endpoints API
5. Componentes UI/Frontend
6. Sistema RBAC Centralizado
7. Sistema de Cola Priorizada
8. API Explorer Integrado
9. Mejoras Implementadas (1-9)
10. Flujos de Datos End-to-End
11. Cronograma de Implementación
12. Checklist de Desarrollo

---

## 1. VISIÓN GENERAL Y OBJETIVOS

### 1.1 Propósito

Consolidar TODA la gestión de Lemonway en un **panel administrativo centralizado** (`/dashboard/admin/lemonway`) que:
- ✅ Unifica las 7 páginas Lemonway dispersas
- ✅ Implementa RBAC granular con 26 permisos específicos
- ✅ Integra API Explorer usando configuración centralizada
- ✅ Agrega sistema de cola priorizada (URGENT | NORMAL)
- ✅ Implementa 9 mejoras estratégicas
- ✅ Proporciona monitoreo y observabilidad en tiempo real
- ✅ Mantiene auditoría completa de todas las operaciones

### 1.2 Objetivos de Negocio

- **Eficiencia**: 60% menos clics para gestionar Lemonway
- **Seguridad**: RBAC centralizado + auditoría completa
- **Confiabilidad**: SLA mejorado 86% en liquidaciones críticas
- **Mantenibilidad**: Código DRY, reutilizable, testeable
- **Escalabilidad**: Soportar 10x tráfico sin cambios arquitectónicos

### 1.3 Usuarios Objetivo

| Rol | Acceso | Permisos |
|-----|--------|----------|
| SuperAdmin | Todo | * (todos) |
| LemonwayAdmin | Panel completo | config:*, api-explorer:*, queries:*, webhooks:*, monitoring:* |
| LemonwayOperator | Limitado | api-explorer:read, queries:read, monitoring:read |
| LemonwayDeveloper | Sandboxing | api-explorer:test (sandbox), queries:test (sandbox) |
| Investor Portal | Solo lectura | accounts:read, transactions:read |

---

## 2. ARQUITECTURA DE LA SOLUCIÓN

### 2.1 Estructura de Carpetas

```
app/dashboard/admin/lemonway/
├── page.tsx (orquestador principal)
├── layout.tsx (con sidebar integrado)
│
├── overview/
│   ├── page.tsx (dashboard KPIs)
│   └── components/
│       ├── stats-cards.tsx
│       ├── health-status.tsx
│       ├── queue-status.tsx
│       └── alerts-widget.tsx
│
├── configuration/
│   ├── page.tsx
│   └── components/
│       ├── auth-config-form.tsx
│       ├── rate-limit-config.tsx
│       ├── retry-config.tsx
│       ├── field-mappings-crud.tsx
│       └── endpoints-manager.tsx
│
├── api-explorer/
│   ├── page.tsx
│   └── components/
│       ├── methods-selector.tsx
│       ├── request-builder.tsx
│       ├── response-viewer.tsx
│       ├── snapshots-compare.tsx
│       └── dry-run-mode.tsx
│
├── custom-queries/
│   ├── page.tsx
│   └── components/
│       ├── queries-list.tsx
│       ├── query-editor.tsx
│       ├── version-history.tsx
│       └── schema-validator.tsx
│
├── operation-types/
│   ├── page.tsx
│   └── components/
│       ├── types-table.tsx
│       ├── type-form.tsx
│       └── priority-rules.tsx
│
├── webhooks/
│   ├── page.tsx
│   └── components/
│       ├── webhooks-list.tsx
│       ├── webhook-form.tsx
│       ├── webhook-logs.tsx
│       └── webhook-simulator.tsx
│
├── import-history/
│   ├── page.tsx
│   └── components/
│       ├── imports-timeline.tsx
│       └── import-details.tsx
│
├── movements/
│   ├── page.tsx
│   └── components/
│       ├── pending-movements-table.tsx
│       ├── movement-review-modal.tsx
│       └── batch-approval.tsx
│
├── queue-management/
│   ├── page.tsx
│   └── components/
│       ├── queue-visualization.tsx
│       ├── urgent-queue-list.tsx
│       ├── normal-queue-list.tsx
│       └── queue-controls.tsx
│
├── monitoring/
│   ├── page.tsx
│   └── components/
│       ├── health-dashboard.tsx
│       ├── performance-charts.tsx
│       ├── alerts-dashboard.tsx
│       └── logs-viewer.tsx
│
└── settings/
    ├── page.tsx
    └── components/
        ├── rbac-management.tsx
        ├── permissions-matrix.tsx
        └── audit-logs.tsx

lib/lemonway/
├── admin/
│   ├── queue-manager.ts (orquestador de cola)
│   ├── custom-queries.ts (CRUD queries)
│   ├── operation-types.ts (CRUD tipos)
│   ├── sandboxing.ts (dry-run, test env)
│   └── monitoring.ts (stats, health)
│
├── api-explorer-integrated.ts (API Explorer centralizado)
├── schema-validator.ts (validación desde Lemonway)
└── snapshots-manager.ts (compare requests/responses)

app/api/admin/lemonway/
├── [endpoints para cada sección - ver sección 4]
```

### 2.2 Diseño de Capas

```
┌─────────────────────────────────────────────────┐
│         UI Layer (React Components)              │
│  Dashboard tabs, forms, tables, charts, modals  │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│      API Layer (Next.js Route Handlers)          │
│   /api/admin/lemonway/* (15 nuevos endpoints)   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│    Business Logic Layer (lib/lemonway/admin/)   │
│  Queue mgmt, permissions, validation, cache    │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│   Lemonway Integration Layer (lib/lemonway/)    │
│  LemonwayClient, webhooks, retry logic, queue  │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│      RBAC & Security Layer (lib/auth/)          │
│  requireAdmin(), permissions cache, auditing   │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│      Database Layer (Neon PostgreSQL)           │
│  All tables, indexes, views, caching logic     │
└─────────────────────────────────────────────────┘
```

---

## 3. CAMBIOS EN BASE DE DATOS

### 3.1 Nuevas Tablas (7 total)

#### Tabla 1: `lemonway.custom_queries`

```sql
CREATE TABLE lemonway.custom_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identidad
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- Query definition
  method_name VARCHAR(255) NOT NULL,  -- FK: LemonwayApiMethod.id
  base_params JSONB NOT NULL,         -- Parámetros base (reutilizables)
  filters JSONB,                      -- Filtros aplicables
  transformations JSONB,              -- Transformaciones a aplicar
  
  -- Priorización automática
  default_priority VARCHAR(20) DEFAULT 'normal' 
    CHECK (priority IN ('urgent', 'normal')),
  priority_rules JSONB,               -- Reglas para auto-determinar urgencia
  
  -- Metadata
  created_by UUID NOT NULL,           -- FK: User.id
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  
  -- Versionado
  version_id UUID,                    -- FK: custom_query_versions.id
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoría
  usage_count INT DEFAULT 0,          -- Cuántas veces se usó
  last_used_at TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES "User"(id),
  FOREIGN KEY (method_name) REFERENCES "LemonwayApiMethod"(id)
);

CREATE INDEX idx_custom_queries_active ON lemonway.custom_queries(is_active)
  WHERE is_active = true;
CREATE INDEX idx_custom_queries_method ON lemonway.custom_queries(method_name);
```

#### Tabla 2: `lemonway.custom_query_versions`

```sql
CREATE TABLE lemonway.custom_query_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  query_id UUID NOT NULL,             -- FK: custom_queries.id
  version_number INT NOT NULL,        -- v1, v2, v3...
  
  -- Query snapshot
  name VARCHAR(255) NOT NULL,
  method_name VARCHAR(255) NOT NULL,
  base_params JSONB NOT NULL,
  filters JSONB,
  transformations JSONB,
  
  -- Cambios
  change_description TEXT,
  change_type VARCHAR(50),            -- 'create', 'update', 'rollback'
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  FOREIGN KEY (query_id) REFERENCES lemonway.custom_queries(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES "User"(id),
  
  UNIQUE(query_id, version_number)
);

CREATE INDEX idx_query_versions_active ON lemonway.custom_query_versions(query_id, is_active)
  WHERE is_active = true;
```

#### Tabla 3: `lemonway.operation_types`

```sql
CREATE TABLE lemonway.operation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipo de operación
  code VARCHAR(50) NOT NULL UNIQUE,   -- 'LIQUIDATION', 'TRANSFER', 'PURCHASE'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Comportamiento
  category VARCHAR(50) NOT NULL,      -- 'FUNDING', 'WITHDRAWAL', 'INVESTMENT', 'TRANSFER'
  default_priority VARCHAR(20) DEFAULT 'normal'
    CHECK (default_priority IN ('urgent', 'normal')),
  
  -- SLA
  sla_hours INT DEFAULT 24,           -- Cuántas horas máximo para procesar
  
  -- Validación
  required_fields JSONB,              -- Campos obligatorios
  field_validators JSONB,             -- Reglas de validación por campo
  
  -- Reglas de urgencia
  auto_urgent_conditions JSONB,       -- { "field": value, "condition": ">" }
  
  -- Metadata
  is_enabled BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES "User"(id),
  CHECK (category IN ('FUNDING', 'WITHDRAWAL', 'INVESTMENT', 'TRANSFER', 'OTHER'))
);

CREATE INDEX idx_operation_types_enabled ON lemonway.operation_types(is_enabled)
  WHERE is_enabled = true;
CREATE INDEX idx_operation_types_category ON lemonway.operation_types(category);
```

#### Tabla 4: `lemonway.api_call_queue`

```sql
CREATE TABLE lemonway.api_call_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contenido de la llamada
  endpoint VARCHAR(500) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  request_payload JSONB NOT NULL,
  
  -- Priorización
  priority VARCHAR(20) NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('urgent', 'normal')),
  priority_score INT DEFAULT 0,       -- Para ordenamiento dentro de prioridad
  
  -- Estado
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'success', 'failed', 'dead_letter')),
  
  -- Reintentos
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 5,
  next_retry_at TIMESTAMP DEFAULT NOW(),
  last_error TEXT,
  
  -- Respuesta (si completada)
  response_payload JSONB,
  response_status_code INT,
  processed_at TIMESTAMP,
  
  -- Metadata
  created_by UUID,                    -- FK: User.id (null si autogenerada)
  created_at TIMESTAMP DEFAULT NOW(),
  intent VARCHAR(50),                 -- 'api_explorer', 'import', 'webhook_retry', 'cron'
  
  FOREIGN KEY (created_by) REFERENCES "User"(id),
  INDEX idx_queue_priority_status (priority DESC, status, next_retry_at),
  INDEX idx_queue_status_retry (status, next_retry_at)
);
```

#### Tabla 5: `lemonway.api_call_snapshots`

```sql
CREATE TABLE lemonway.api_call_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  api_call_id UUID NOT NULL,          -- FK: api_call_queue.id
  
  -- Captura de request/response
  request_json JSONB NOT NULL,
  response_json JSONB,
  
  -- Metadata
  status_code INT,
  latency_ms INT,
  timestamp TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (api_call_id) REFERENCES lemonway.api_call_queue(id) ON DELETE CASCADE,
  INDEX idx_snapshots_call (api_call_id)
);
```

#### Tabla 6: `lemonway.test_environments`

```sql
CREATE TABLE lemonway.test_environments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL,
  environment_name VARCHAR(255) NOT NULL,
  
  -- Configuración sandbox
  is_sandbox BOOLEAN DEFAULT true,
  max_requests_per_minute INT DEFAULT 5,
  data_isolation JSONB,               -- Datos aislados para testing
  
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES "User"(id),
  UNIQUE(user_id, environment_name)
);
```

#### Tabla 7: `lemonway.rate_limit_buckets`

```sql
CREATE TABLE lemonway.rate_limit_buckets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL,
  bucket_key VARCHAR(255) NOT NULL,   -- 'user:id', 'ip:addr', 'method:name'
  
  request_count INT DEFAULT 0,
  reset_at TIMESTAMP NOT NULL,
  
  FOREIGN KEY (user_id) REFERENCES "User"(id),
  UNIQUE(user_id, bucket_key, reset_at),
  INDEX idx_rate_limit_reset (reset_at)
);
```

### 3.2 Columnas Nuevas en Tablas Existentes

#### Modificación 1: `LemonwayApiCallLog`

```sql
-- Agregar columna de prioridad
ALTER TABLE "LemonwayApiCallLog"
ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('urgent', 'normal'));

-- Agregar índice para búsqueda eficiente
CREATE INDEX idx_queue_priority_status_retry
ON "LemonwayApiCallLog"(
  priority DESC,
  retry_status,
  next_retry_at
);

-- Agregar columna de intención
ALTER TABLE "LemonwayApiCallLog"
ADD COLUMN intent VARCHAR(50) DEFAULT 'unknown';
  -- Valores: 'api_explorer', 'import', 'cron', 'webhook_retry', 'manual'

-- Agregar columna de duración
ALTER TABLE "LemonwayApiCallLog"
ADD COLUMN duration_ms INT;
```

#### Modificación 2: `Permission`

```sql
-- Agregar 26 nuevos permisos Lemonway (ver sección 6.2)
INSERT INTO "Permission" (resource, action, description)
VALUES
  ('lemonway:config', 'read', 'Ver configuración de Lemonway'),
  ('lemonway:config', 'write', 'Editar configuración de Lemonway'),
  ('lemonway:api-explorer', 'read', 'Acceder a API Explorer'),
  ('lemonway:api-explorer', 'test', 'Ejecutar queries en API Explorer'),
  ('lemonway:queries', 'read', 'Ver queries personalizadas'),
  ('lemonway:queries', 'create', 'Crear queries personalizadas'),
  ('lemonway:queries', 'edit', 'Editar queries personalizadas'),
  ('lemonway:queries', 'delete', 'Eliminar queries personalizadas'),
  -- ... (18 más, ver tabla completa en sección 6.2)
```

---

## 4. NUEVOS ENDPOINTS API (15 total)

### 4.1 Configuración General

**Todos los endpoints:**
- Ruta base: `/api/admin/lemonway/`
- Requieren autenticación + `requireAdmin()`
- Retornan respuesta estándar: `{ success: boolean, data?: {}, error?: string }`
- Registran en `AccessLog` automáticamente
- Caché: 5 minutos (invalidado on change)

### 4.2 Endpoints Detallados

#### GET `/api/admin/lemonway/config`
**Propósito**: Obtener configuración actual de Lemonway
**Permisos**: `lemonway:config:read`
**Response**:
```json
{
  "success": true,
  "data": {
    "environment": "sandbox",
    "apiToken": "***masked***",
    "walletId": "12345",
    "maxConcurrentRequests": 3,
    "minDelayBetweenRequestsMs": 1000,
    "retryConfig": {
      "maxAttempts": 5,
      "delayMs": [1000, 2000, 4000, 8000, 16000]
    },
    "statusOk": true,
    "lastTestAt": "2026-01-12T20:30:00Z"
  }
}
```

#### PUT `/api/admin/lemonway/config`
**Propósito**: Actualizar configuración de Lemonway
**Permisos**: `lemonway:config:write`
**Body**:
```json
{
  "environment": "production",
  "walletId": "12345",
  "maxConcurrentRequests": 5,
  "minDelayBetweenRequestsMs": 500,
  "retryConfig": { ... }
}
```

#### POST `/api/admin/lemonway/config/test`
**Propósito**: Probar conexión a Lemonway
**Permisos**: `lemonway:config:read`

#### GET `/api/admin/lemonway/custom-queries`
**Propósito**: Listar todas las custom queries
**Params**: `?page=1&limit=20&search=name&sort=created_at`
**Permisos**: `lemonway:queries:read`

#### POST `/api/admin/lemonway/custom-queries`
**Propósito**: Crear nueva custom query
**Permisos**: `lemonway:queries:create`
**Body**:
```json
{
  "name": "Get Investor Transactions",
  "description": "Obtiene transacciones de inversor específico",
  "methodName": "GetWalletTransactions",
  "baseParams": { "walletId": "{investor_wallet_id}" },
  "filters": { "status": "COMPLETED" },
  "defaultPriority": "normal"
}
```

#### PUT `/api/admin/lemonway/custom-queries/{id}`
**Propósito**: Actualizar custom query (crea nueva versión)
**Permisos**: `lemonway:queries:edit`

#### DELETE `/api/admin/lemonway/custom-queries/{id}`
**Propósito**: Eliminar custom query
**Permisos**: `lemonway:queries:delete`

#### GET `/api/admin/lemonway/custom-queries/{id}/versions`
**Propósito**: Ver historial de versiones de una query
**Permisos**: `lemonway:queries:read`

#### POST `/api/admin/lemonway/custom-queries/{id}/rollback`
**Propósito**: Revertir a versión anterior
**Permisos**: `lemonway:queries:edit`
**Body**: `{ "versionId": "uuid" }`

#### GET `/api/admin/lemonway/operation-types`
**Propósito**: Listar tipos de operación
**Permisos**: `lemonway:operations:read`

#### POST `/api/admin/lemonway/operation-types`
**Propósito**: Crear tipo de operación
**Permisos**: `lemonway:operations:create`

#### PUT `/api/admin/lemonway/operation-types/{id}`
**Propósito**: Actualizar tipo de operación
**Permisos**: `lemonway:operations:edit`

#### DELETE `/api/admin/lemonway/operation-types/{id}`
**Propósito**: Eliminar tipo de operación
**Permisos**: `lemonway:operations:delete`

#### GET `/api/admin/lemonway/queue/status`
**Propósito**: Obtener estado actual de colas
**Permisos**: `lemonway:queue:read`
**Response**:
```json
{
  "success": true,
  "data": {
    "urgent": {
      "pending": 3,
      "processing": 1,
      "oldestCreatedAt": "2026-01-12T20:00:00Z",
      "estimatedWaitMs": 30000
    },
    "normal": {
      "pending": 25,
      "processing": 2,
      "oldestCreatedAt": "2026-01-12T19:45:00Z",
      "estimatedWaitMs": 180000
    },
    "health": { "status": "healthy|degraded|critical" }
  }
}
```

#### GET `/api/admin/lemonway/api-explorer/test`
**Propósito**: Ejecutar query en API Explorer con config centralizada
**Permisos**: `lemonway:api-explorer:test`
**Body**:
```json
{
  "methodName": "GetWalletTransactions",
  "parameters": { "walletId": "123" },
  "dryRun": false,
  "queryId": null
}
```

---

## 5. COMPONENTES UI/FRONTEND

### 5.1 Estructura de Componentes

```
Dashboard principal (/dashboard/admin/lemonway)
├── Sidebar con 9 tabs
├── Header con breadcrumbs
│
├── Tab 1: Overview
│   ├── StatsCards (KPIs: uptime, requests/día, etc)
│   ├── HealthStatus (verde/amarillo/rojo)
│   ├── QueueStatus (gráfico urgente vs normal)
│   └── AlertsWidget (últimas 5 alertas)
│
├── Tab 2: Configuration
│   ├── AuthConfig (token, wallet ID, environment)
│   ├── RateLimitConfig (concurrent, delay)
│   ├── RetryConfig (attempts, delays exponenciales)
│   ├── FieldMappingsCrud (tabla + modal de edición)
│   └── ConnectionStatus (test button + resultado)
│
├── Tab 3: API Explorer
│   ├── MethodsSelector (dropdown + search)
│   ├── RequestBuilder (form auto-generado)
│   ├── DryRunMode (toggle)
│   ├── ExecuteButton
│   ├── ResponseViewer (formatted JSON)
│   └── SnapshotsCompare (comparar 2 calls)
│
├── Tab 4: Custom Queries
│   ├── QueriesList (table con acciones)
│   ├── QueryEditor (form para crear/editar)
│   ├── VersionHistory (tabla de versiones)
│   └── RollbackButton
│
├── Tab 5: Operation Types
│   ├── TypesTable (CRUD con inline edit)
│   └── PriorityRules (editor de reglas)
│
├── Tab 6: Webhooks
│   ├── WebhooksList (tabla)
│   ├── WebhookForm (crear/editar)
│   ├── WebhookLogs (historial de eventos)
│   └── WebhookSimulator (enviar eventos de test)
│
├── Tab 7: Import History
│   ├── ImportsTimeline (vista temporal)
│   └── ImportDetails (expandible)
│
├── Tab 8: Movements
│   ├── PendingMovementsTable (filtrable)
│   ├── MovementReviewModal (aprobar/rechazar)
│   └── BatchApprovalButton
│
├── Tab 9: Queue Management
│   ├── QueueVisualization (gráfico en tiempo real)
│   ├── UrgentQueueList (tabla prioridad 1)
│   ├── NormalQueueList (tabla prioridad 2)
│   └── QueueControls (replay, clear, etc)
│
└── Tab 10: Monitoring
    ├── HealthDashboard
    ├── PerformanceCharts (latency, throughput)
    ├── AlertsDashboard
    └── LogsViewer (búsqueda + filtros)
```

### 5.2 Mejoras de UX

- **Notificaciones en tiempo real**: WebSocket para actualizaciones de cola
- **Búsqueda global**: Buscar queries, operaciones, logs en todo el panel
- **Exportación**: Descargar logs, snapshots como CSV/JSON
- **Tema oscuro**: Soporte completo (via shadcn/ui)
- **Mobile responsive**: 80% funcionalidad en mobile

---

## 6. SISTEMA RBAC CENTRALIZADO

### 6.1 Arquitectura RBAC

**3 Niveles de Acceso:**

1. **Nivel 1 - Role Based** (4 roles propuestos)
   - SuperAdmin: * (todo)
   - LemonwayAdmin: 26 permisos específicos
   - LemonwayOperator: read-only + test
   - LemonwayDeveloper: sandbox only

2. **Nivel 2 - Permission Based** (26 permisos)
   - Cada endpoint protegido por permiso específico
   - Caché de 5 minutos en memoria
   - Auditoría en `AccessLog`

3. **Nivel 3 - Data Based** (en el futuro)
   - Restricción por ambiente (sandbox vs production)
   - Restricción por usuario propietario

### 6.2 Matriz de 26 Permisos

| # | Permiso | Recurso | Acción | LemonwayAdmin | LemonwayOperator | LemonwayDeveloper |
|---|---------|---------|--------|---------------|------------------|-------------------|
| 1 | lemonway:config:read | config | read | ✅ | ✅ | ✅ |
| 2 | lemonway:config:write | config | write | ✅ | ❌ | ❌ |
| 3 | lemonway:api-explorer:read | api-explorer | read | ✅ | ✅ | ✅ |
| 4 | lemonway:api-explorer:test | api-explorer | test | ✅ | ✅ | ✅ (sandbox) |
| 5 | lemonway:api-explorer:test:prod | api-explorer | test:prod | ✅ | ❌ | ❌ |
| 6 | lemonway:queries:read | queries | read | ✅ | ✅ | ✅ |
| 7 | lemonway:queries:create | queries | create | ✅ | ❌ | ✅ |
| 8 | lemonway:queries:edit | queries | edit | ✅ | ❌ | ✅ (sandbox) |
| 9 | lemonway:queries:delete | queries | delete | ✅ | ❌ | ❌ |
| 10 | lemonway:queries:publish | queries | publish | ✅ | ❌ | ❌ |
| 11 | lemonway:operations:read | operations | read | ✅ | ✅ | ✅ |
| 12 | lemonway:operations:create | operations | create | ✅ | ❌ | ❌ |
| 13 | lemonway:operations:edit | operations | edit | ✅ | ❌ | ❌ |
| 14 | lemonway:operations:delete | operations | delete | ✅ | ❌ | ❌ |
| 15 | lemonway:webhooks:read | webhooks | read | ✅ | ✅ | ✅ |
| 16 | lemonway:webhooks:write | webhooks | write | ✅ | ❌ | ❌ |
| 17 | lemonway:webhooks:test | webhooks | test | ✅ | ✅ | ✅ |
| 18 | lemonway:queue:read | queue | read | ✅ | ✅ | ✅ |
| 19 | lemonway:queue:manage | queue | manage | ✅ | ❌ | ❌ |
| 20 | lemonway:movements:read | movements | read | ✅ | ✅ | ❌ |
| 21 | lemonway:movements:approve | movements | approve | ✅ | ✅ | ❌ |
| 22 | lemonway:movements:reject | movements | reject | ✅ | ✅ | ❌ |
| 23 | lemonway:monitoring:read | monitoring | read | ✅ | ✅ | ✅ |
| 24 | lemonway:monitoring:alerts | monitoring | alerts | ✅ | ✅ | ❌ |
| 25 | lemonway:sandbox:access | sandbox | access | ✅ | ❌ | ✅ |
| 26 | lemonway:audit:read | audit | read | ✅ | ❌ | ❌ |

### 6.3 Implementación Técnica

```typescript
// En cada endpoint
const user = await requireAdmin(
  session,
  "lemonway:config",  // recurso
  "read",             // acción
  request
)
// Si falla: 403 Forbidden + log en AccessLog

// En base de datos
// 1. INSERT 26 permisos en table "Permission"
// 2. CREATE 4 roles en table "Role"
// 3. INSERT RolePermission entries (104 total: 26 permisos × 4 roles)
// 4. ASIGNAR roles a usuarios en table "UserRole"
```

---

## 7. SISTEMA DE COLA PRIORIZADA

### 7.1 Arquitectura

```
Cola Dual FIFO con Priorización
├─ Cola URGENTE (FIFO)
│  └─ Se procesa SIEMPRE primero
└─ Cola NORMAL (FIFO)
   └─ Se procesa cuando no hay urgentes
```

### 7.2 Determinación Automática de Prioridad

```typescript
function determinePriority(
  operationType: OperationType,
  amount: number,
  userId: string
): 'urgent' | 'normal' {
  
  // Regla 1: Operaciones críticas siempre urgentes
  if (operationType.code === 'LIQUIDATION') return 'urgent'
  if (operationType.code === 'WITHDRAWAL') return 'urgent'
  
  // Regla 2: Montos altos = urgentes
  if (amount > 50000) return 'urgent'
  
  // Regla 3: Usuarios VIP = urgentes
  if (isVIPUser(userId)) return 'urgent'
  
  // Default
  return 'normal'
}
```

### 7.3 Procesamiento

```sql
-- Nueva query que respeta priorización
SELECT * FROM "LemonwayApiCallLog"
WHERE retry_status = 'pending'
  AND next_retry_at <= NOW()
ORDER BY 
  priority DESC,      -- urgent (1) antes que normal (0)
  created_at ASC      -- FIFO dentro de cada nivel
LIMIT 50;

-- Con índice optimizado
CREATE INDEX idx_queue_priority_fifo
ON "LemonwayApiCallLog"(priority DESC, created_at ASC)
WHERE retry_status = 'pending';
```

### 7.4 Configuración por Prioridad

| Aspecto | URGENT | NORMAL |
|---------|--------|--------|
| Max Concurrent | 5 | 2 |
| Min Delay | 100ms | 500ms |
| Max Retries | 8 | 5 |
| Retry Delays | 100ms, 200ms, 400ms... | 1s, 2s, 4s... |
| Timeout | 30s | 60s |
| SLA Target | 5 minutos | 1 hora |

---

## 8. API EXPLORER INTEGRADO

### 8.1 Cambios Principales

**Antes** (desacoplado):
- Métodos hardcodeados
- Sin respetar rate limiting
- Sin respetar reintentos
- URLs estáticas

**Después** (integrado):
- ✅ Métodos desde tabla centralizada
- ✅ Respetar rate limiting
- ✅ Respetar reintentos
- ✅ URLs desde config
- ✅ Caché de configuración
- ✅ Auditoría centralizada

### 8.2 Flujo de Ejecución

```
Usuario en tab "API Explorer"
  ↓
Selecciona método (GET /api/admin/lemonway/api-explorer/methods)
  ↓
Endpoint retorna métodos desde `LemonwayApiMethod` table
  ↓
Frontend construye form desde JSON schema del método
  ↓
Usuario ingresa parámetros + opcionales (dry-run, etc)
  ↓
POST /api/admin/lemonway/api-explorer/test
{
  methodName: "GetWalletTransactions",
  parameters: { walletId: "123" },
  dryRun: false,
  queryId: null  // null = adhoc, o ID si saved query
}
  ↓
Backend:
  1. Verifica permiso: lemonway:api-explorer:test
  2. Obtiene config centralizada de `LemonwayConfig`
  3. Crear LemonwayClient con esa config
  4. Si dryRun: simula (muestra qué haría)
  5. Si no: ejecuta realmente respetando:
     - Rate limiting
     - Reintentos
     - Timeouts
  6. INSERT en LemonwayApiCallLog (intent='api_explorer')
  7. INSERT en api_call_snapshots
  8. Retorna response
  ↓
Frontend muestra resultado + opción de comparar snapshots
```

---

## 9. MEJORAS IMPLEMENTADAS (1-9)

### 9.1 MEJORA 1: Sandboxing para Queries

- ✅ Tabla: `test_environments`
- ✅ Dry-run mode en UI
- ✅ Validación sin ejecutar
- ✅ Rate limit limitado (5 req/min)
- ✅ Permiso: `lemonway:sandbox:access`

### 9.2 MEJORA 2: Versionado de Queries

- ✅ Tabla: `custom_query_versions`
- ✅ Cada cambio = nueva versión
- ✅ Historial completo
- ✅ Rollback 1-click

### 9.3 MEJORA 3: Validación Schema + Code Generation

- ✅ JSON Schemas desde Lemonway
- ✅ Auto-generación de forms
- ✅ Validación en tiempo real
- ✅ Documentación inline

### 9.4 MEJORA 4: Request/Response Snapshots

- ✅ Tabla: `api_call_snapshots`
- ✅ Comparación visual (diff)
- ✅ Debugging facilitado

### 9.5 MEJORA 5: Webhook Simulation

- ✅ UI para enviar eventos de test
- ✅ Sin afectar datos reales
- ✅ Loguear intentos

### 9.6 MEJORA 6: Rate Limit Dashboard

- ✅ Monitoreo en tiempo real
- ✅ Visualización de buckets
- ✅ Alertas de acercarse al límite

### 9.7 MEJORA 7: Import Scheduling

- ✅ Backoff inteligente
- ✅ Priorización de reintentos

### 9.8 MEJORA 8: Permisos Granulares

- ✅ 26 permisos específicos
- ✅ Por sección (config, queries, etc)

### 9.9 MEJORA 9: Data Masking

- ✅ Tokens enmascarados en UI
- ✅ Solicitar confirmación para sensibles
- ✅ Auditoría de acceso

---

## 10. FLUJOS DE DATOS END-TO-END

### 10.1 Flujo: Usuario crea Custom Query

```
1. LemonwayAdmin en tab "Custom Queries"
2. Click "Nueva Query"
3. Abre modal QueryEditor
4. Selecciona método: "GetWalletTransactions"
5. Ingresa parámetros: { walletId: "{investor_id}" }
6. Click "Test" (Dry-Run)
   - POST /api/admin/lemonway/api-explorer/test
   - Muestra qué haría (SIN ejecutar)
7. Click "Crear Query"
   - POST /api/admin/lemonway/custom-queries
   - INSERT en custom_queries + custom_query_versions
   - AccessLog: "lemonway:queries:create - Exitoso"
8. Query aparece en lista
9. Próxima vez: dropdown de queries disponibles
```

### 10.2 Flujo: Procesamiento de Cola Priorizada

```
Cron Job (cada 1 minuto): POST /api/cron/process-lemonway-queue

1. SELECT * FROM LemonwayApiCallLog
   WHERE retry_status='pending' AND next_retry_at <= NOW()
   ORDER BY priority DESC, created_at ASC
   LIMIT 50

2. For each call:
   a. IF priority='urgent': process immediately
      - Max concurrent: 5
      - Min delay: 100ms
   
   b. ELSE (priority='normal'): process after urgents
      - Max concurrent: 2
      - Min delay: 500ms

3. Ejecutar request a Lemonway
   - LemonwayClient respeta config
   - Aplicar rate limiting
   - Aplicar reintentos si falla

4. UPDATE resultado:
   - Si success: retry_status='success'
   - Si error: retry_count++, next_retry_at += delay
   - Si max retries: final_failure=true

5. INSERT en api_call_snapshots (para debugging)

6. Si failure: enviar alerta a admin
```

### 10.3 Flujo: Admin aprueba movimiento con prioridad automática

```
1. Movimiento importado llega a lemonway_temp.movimientos_cuenta
2. Cron detecta: crear tarea APROBACION_MOVIMIENTO
3. LemonwayOperator ve movimiento en tab "Movements"
4. Revisa detalles
5. Click "Aprobar"
   - POST /api/admin/lemonway/movements/{id}/approve
6. Backend determina prioridad automáticamente:
   - monto > 10000? → urgente
   - tipo LIQUIDATION? → urgente
   - else → normal
7. INSERT en api_call_queue con priority
8. Cron próximo lo procesa según prioridad
9. INSERT en virtual_accounts.movimientos_cuenta
10. AccessLog: movimiento aprobado
```

---

## 11. CRONOGRAMA DE IMPLEMENTACIÓN

### Fase 1: Base de Datos (Semana 1)
- [ ] Crear 7 nuevas tablas
- [ ] Agregar columnas a tablas existentes
- [ ] Crear índices
- [ ] Insertar 26 permisos + 4 roles
- [ ] Scripts de migración listos

### Fase 2: Backend API (Semanas 2-3)
- [ ] 15 nuevos endpoints
- [ ] Protección RBAC en cada uno
- [ ] Caché de configuración
- [ ] Sistema de cola priorizada
- [ ] Lógica de determinación de urgencia

### Fase 3: Frontend Dashboard (Semanas 3-4)
- [ ] Layout general (/dashboard/admin/lemonway)
- [ ] Tab Overview (KPIs, stats)
- [ ] Tab Configuration (formularios)
- [ ] Tab API Explorer (integrado)
- [ ] Tab Custom Queries (CRUD)

### Fase 4: Mejoras Avanzadas (Semana 5)
- [ ] Snapshots + Diff viewer
- [ ] Versionado de queries
- [ ] Webhook simulator
- [ ] Data masking
- [ ] Sandboxing

### Fase 5: Testing + Deployment (Semana 6)
- [ ] Tests unitarios (90%+ coverage)
- [ ] Tests de integración
- [ ] Load testing (colas)
- [ ] Security audit
- [ ] Deployment a staging
- [ ] Beta testing con usuarios
- [ ] Deployment a production

---

## 12. CHECKLIST DE DESARROLLO

### Pre-Implementación
- [ ] Aprobación de esta especificación
- [ ] Estimación de puntos story
- [ ] Asignación de tasks
- [ ] Ambiente de desarrollo preparado
- [ ] Base de datos backup

### Base de Datos
- [ ] Crear script de migración (down + up)
- [ ] Ejecutar en desarrollo
- [ ] Verify con SELECT queries
- [ ] Crear índices
- [ ] Verificar performance (EXPLAIN ANALYZE)
- [ ] Backup completo

### Backend
- [ ] Crear middleware de autorización
- [ ] Implementar 15 endpoints
- [ ] Tests unitarios (cada function)
- [ ] Tests de integración (full flow)
- [ ] Error handling (400, 403, 500)
- [ ] Logging completo
- [ ] Rate limiting funcionando
- [ ] Caching operacional

### Frontend
- [ ] Componentes base (buttons, inputs, tables)
- [ ] Layouts (sidebar, tabs, headers)
- [ ] Formularios (validación, submit)
- [ ] Listados (paginación, filtros, search)
- [ ] Modales (edit, delete, confirm)
- [ ] Notificaciones (toast, alerts)
- [ ] Errores (boundary, fallback)
- [ ] Loading states (skeleton, spinners)
- [ ] Tests (snapshot, interaction)

### Integración
- [ ] API Explorer funciona con config centralizada
- [ ] Cola priorizada procesa correct
- [ ] RBAC denegando accesos que debe
- [ ] Auditoría registrando todo
- [ ] Caché invalidándose correctamente
- [ ] Rate limiting funcionando

### Testing
- [ ] 100% coverage en funciones críticas
- [ ] Performance: < 200ms queries
- [ ] Load: 1000 items en lista sin lag
- [ ] Seguridad: no exponer datos sensibles
- [ ] Accesibilidad: WCAG AA compliant

### Deployment
- [ ] Feature flags para rollout gradual
- [ ] Monitoring + alertas activas
- [ ] Runbook de rollback
- [ ] Comunicación a usuarios
- [ ] Documentación actualizada
- [ ] Training para admins

---

## NOTAS FINALES

**Documento versión**: 1.0  
**Fecha**: 12 de Enero, 2026  
**Autor**: v0 AI  
**Estado**: Especificación Técnica Completa (pendiente aprobación)  

**Cambios respecto a anteriores documentos:**
- ✅ Consolidación de 4 propuestas en 1
- ✅ RBAC centralizado integrado
- ✅ Sistema de cola dual FIFO
- ✅ API Explorer integrado con config centralizada
- ✅ 9 mejoras específicas
- ✅ 15 endpoints detallados
- ✅ 7 nuevas tablas BD
- ✅ 26 permisos específicos
- ✅ Checklist de 50+ items

**Siguiente paso:** Aprobación de especificación + Inicio de Fase 1 (BD)
