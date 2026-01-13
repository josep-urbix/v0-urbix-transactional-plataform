# OPCIÓN 2 - Integración de API Explorer con Configuración Centralizada

## 1. PROBLEMA ACTUAL

### 1.1 API Explorer Desacoplado
- **Ubicación**: `/dashboard/lemonway-api-explorer`
- **Componentes**: `LemonwayApiExplorer.tsx`
- **Independencia**: Usa métodos hardcodeados en `components/lemonway-api/methods-list.tsx`
- **Configuración**: Accede a `/api/lemonway/config` directamente pero NO reutiliza las configuraciones
- **Limitación**: No hay conexión clara entre:
  - Rate limiting configurado
  - Reintentos configurados
  - Endpoints específicos guardados
  - Queries personalizadas (si existieran)

### 1.2 El Desafío
Cuando un usuario configura en `/dashboard/lemonway-config`:
- ✅ Rate limits (max concurrent requests, min delay)
- ✅ Reintentos (delay, max attempts)
- ✅ URLs de endpoints
- ✅ Field mappings

**Luego en API Explorer:**
- ❌ No se respeta el rate limiting
- ❌ No se respeta la configuración de reintentos
- ❌ Se usan URLs hardcodeadas, no las configuradas
- ❌ No hay forma de ejecutar queries personalizadas

---

## 2. VISIÓN PARA OPCIÓN 2: API Explorer Integrado

### 2.1 Arquitectura Propuesta

```
/dashboard/admin/lemonway/
├── tabs principales
│   ├── Overview (resumen, KPIs)
│   ├── Configuration (config auth, rate limiting, urls)
│   ├── API Explorer (INTEGRADO - usa config centralizada)
│   ├── Custom Queries (CRUD de queries personalizadas)
│   ├── Operation Types (CRUD de tipos de operación)
│   ├── Webhooks (webhook management)
│   ├── Import History (historial de importaciones)
│   ├── Movements (movimientos temporales)
│   └── Monitoring (stats, health, alerts)
```

### 2.2 Cómo API Explorer Usaría Configuración Centralizada

#### En la UI (Frontend)
```
┌─────────────────────────────────────────────┐
│  Panel Admin Lemonway > API Explorer Tab    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Métodos Disponibles                 │   │
│  ├─────────────────────────────────────┤   │
│  │ [Retrieve Accounts] ← methods list   │   │
│  │ [Get Wallets]                       │   │
│  │ [Transaction List]                  │   │
│  │ [Get Balance]                       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌────────────────────────────────────────┐ │
│  │ Detalle del Método + Tester            │ │
│  ├────────────────────────────────────────┤ │
│  │                                        │ │
│  │  Method: RetrieveAccounts              │ │
│  │  URL: [desde config centralizada] ✓    │ │
│  │                                        │ │
│  │  Headers:                              │ │
│  │  - Authorization: Bearer [token]       │ │
│  │  - Content-Type: application/json      │ │
│  │                                        │ │
│  │  Body Parameters:                      │ │
│  │  [Generar desde método info]           │ │
│  │                                        │ │
│  │  ┌──────────────────────────────────┐  │
│  │  │ Test (respeta rate limit)        │  │
│  │  │ Load Preset                      │  │
│  │  │ Save as Custom Query             │  │
│  │  └──────────────────────────────────┘  │
│  │                                        │ │
│  │  Response:                             │ │
│  │  [resultado formateado]                │ │
│  │                                        │ │
│  └────────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

#### En el Backend (API)

**New Endpoint: `GET /api/admin/lemonway/api-explorer/test`**

```typescript
// 1. Obtiene config centralizada (auth, rate limit, etc)
config = await getActiveLemonwayConfig()

// 2. Crea instancia de LemonwayClient con esa config
client = new LemonwayClient(config)

// 3. El client automáticamente:
//    - Aplica rate limiting
//    - Respeta reintentos
//    - Usa las URLs configuradas
//    - Mapea campos según field mappings

// 4. Ejecuta la query
response = await client.executeMethod(methodName, parameters)

// 5. Registra en LemonwayApiCallLog automáticamente
// (con intent=api_explorer para tracking)

return response
```

---

## 3. INTEGRACIÓN ESPECÍFICA EN OPCIÓN 2

### 3.1 Flujo de Datos: API Explorer Integrado

```
Usuario en /dashboard/admin/lemonway
    ↓
Selecciona método en API Explorer tab
    ↓
Frontend fetch: GET /api/admin/lemonway/api-explorer/methods
    ↓ (devuelve métodos con estructura)
Usuario configura parámetros
    ↓
POST /api/admin/lemonway/api-explorer/test
{
  methodName: "GetWalletTransactions",
  parameters: { walletId: "123", fromDate: "2026-01-01" },
  queryId: null  // null = adhoc, o ID si es saved query
}
    ↓
Backend:
  1. getActiveLemonwayConfig() ← usa tabla centralizada
  2. new LemonwayClient(config) ← con rate limit, reintentos
  3. client.executeMethod(...) ← respeta todo
  4. INSERT LemonwayApiCallLog
      WITH intent='api_explorer'
    ↓
Response + historial actualizado
```

### 3.2 Configuración Reutilizada en API Explorer

**From Config Table** → **Used By API Explorer**

| Config Item | Storage | API Explorer Respects |
|-------------|---------|----------------------|
| API Token | `LemonwayConfig.api_token` | ✅ Auth headers |
| Wallet ID | `LemonwayConfig.wallet_id` | ✅ Default in params |
| Environment (sandbox/prod) | `LemonwayConfig.environment` | ✅ Endpoints URLs |
| OAuth URL | `LemonwayConfig.oauth_url` | ✅ Token refresh |
| Max Concurrent | `LemonwayConfig.max_concurrent_requests` | ✅ Rate limiting |
| Min Delay | `LemonwayConfig.min_delay_between_requests_ms` | ✅ Rate limiting |
| Retry Config | `LemonwayRetryConfig` | ✅ Auto-retries |
| Endpoints URLs | `LemonwayConfig.*_url` | ✅ Base URLs |
| Field Mappings | `LemonwayFieldMapping` | ✅ Response parsing |

---

## 4. VENTAJAS DE API EXPLORER INTEGRADO EN OPCIÓN 2

### 4.1 Sincronización Automática
- ✅ Cambios en config → inmediatamente activos en API Explorer
- ✅ No hay "versiones duplicadas" de configuración
- ✅ Rate limiting siempre consistente

### 4.2 Auditoría Centralizada
- ✅ Todas las llamadas en `LemonwayApiCallLog` con context
- ✅ Filtro por `intent='api_explorer'` vs `'cron_import'` vs `'workflow'`
- ✅ Debugging más fácil

### 4.3 Testing Realista
- ✅ Cuando testeas en API Explorer, usas EXACTAMENTE las mismas config que en producción
- ✅ Descubre problemas antes de que afecten crons/workflows
- ✅ Rate limit visible: "3 concurrent requests active, queued: 2"

### 4.4 Queries Personalizadas Reutilizables
- ✅ Guardar queries frecuentes en `LemonwayCustomQuery` (nueva tabla)
- ✅ Ejecutar desde API Explorer
- ✅ O desde cron/webhook automáticamente
- ✅ Una solo source of truth

---

## 5. CAMBIOS NECESARIOS EN OPCIÓN 2

### 5.1 Nueva Tabla BD

```sql
CREATE TABLE "LemonwayCustomQuery" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  method_name VARCHAR(255) NOT NULL,
  parameters JSONB NOT NULL,
  created_by INTEGER REFERENCES "User"(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_system BOOLEAN DEFAULT FALSE,  -- presets del sistema
  usage_count INTEGER DEFAULT 0,
  last_executed TIMESTAMP,
  tags TEXT[],
  UNIQUE(name)
);

CREATE TABLE "LemonwayOperationType" (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  method_mapping JSONB,  -- mapping a métodos Lemonway
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 Nuevos Endpoints

```
GET    /api/admin/lemonway/api-explorer/methods
       → Métodos disponibles + esquema

GET    /api/admin/lemonway/api-explorer/methods/[name]
       → Detalle de método específico

POST   /api/admin/lemonway/api-explorer/test
       → Ejecutar método (respeta config)

GET    /api/admin/lemonway/custom-queries
       → Listar queries personalizadas

POST   /api/admin/lemonway/custom-queries
       → Crear query personalizada

DELETE /api/admin/lemonway/custom-queries/[id]
       → Eliminar query

POST   /api/admin/lemonway/operation-types
       → CRUD operación types

GET    /api/admin/lemonway/config/active
       → Config actual activa (todo integrado)
```

### 5.3 Cambios en Componentes

**Cambiar:**
- `LemonwayApiExplorer` → incluir en panel admin como tab
- Métodos hardcodeados → cargar desde BD + config centralizada
- Lógica de test → usar endpoint centralizado que aplica config

**Reutilizar:**
- `LemonwayMethodsList` componente (funciona igual)
- `LemonwayCallHistory` componente (genera mismo HTML)
- `LemonwayPresets` → extender para "Custom Queries"

---

## 6. FLUJO DE USUARIO EN OPCIÓN 2

### Escenario: Un Admin Testea Nueva Query

```
1. Va a /dashboard/admin/lemonway
2. Click en tab "API Explorer"
3. Ve métodos Lemonway (cargados con config actual)
4. Selecciona "GetWalletTransactions"
5. Sistema muestra:
   - URL base desde config
   - Headers necesarios
   - Parámetros requeridos con tipos
6. Admin ingresa parámetros
7. Admin hace click "Test"
   ↓
   - Rate limit: "2/3 slots disponibles, espera..."
   - 200 OK → Muestra respuesta
8. Admin hace click "Save as Query"
   ↓
   - Dialogo: Nombre, Tags, Descripción
   - Guarda en LemonwayCustomQuery
9. Luego puede:
   - Ejecutar de nuevo con 1 click
   - Usarla en workflows/crons
   - Exportar/compartir con equipo
```

---

## 7. IMPLEMENTACIÓN EN FASES (Opción 2)

### Fase 1: Estructura Base (Semana 1)
- Crear `/dashboard/admin/lemonway` con tabs
- Mover UI existente a tabs (config, webhooks, imports)
- NO cambiar funcionamiento aún

### Fase 2: API Explorer Integrado (Semana 2)
- Crear endpoints `api-explorer/test` que usa config centralizada
- Migrar componentes de API Explorer al nuevo dashboard
- Conectar con LemonwayClient respetando config

### Fase 3: Custom Queries (Semana 2)
- Crear tabla `LemonwayCustomQuery`
- CRUD endpoints
- UI para guardar/gestionar queries en API Explorer

### Fase 4: Operation Types (Semana 3)
- Crear tabla `LemonwayOperationType`
- CRUD UI
- Integración con process templates

### Fase 5: Monitoring & Polish (Semana 3)
- Dashboard de KPIs en "Overview" tab
- Dashboards de health/alerts
- Documentación

---

## 8. MOCKUP ASCII: Tab API Explorer en Opción 2

```
┌──────────────────────────────────────────────────────────────────────┐
│ Dashboard Admin Lemonway                                             │
├──────────────────────────────────────────────────────────────────────┤
│ [Overview] [Configuration] [API Explorer*] [Queries] [Types] [...]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Métodos Lemonway (config: PRODUCTION, Token: ******, Wallet: 123) │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌──────────────────────────┐  ┌──────────────────────────────────┐ │
│  │ Categorías:              │  │ GetWalletTransactions            │ │
│  │ [x] Accounts (5)         │  │                                  │ │
│  │ [ ] Balance (3)          │  │ URL: https://api.lemonway.../   │ │
│  │ [ ] Transactions (6)     │  │      accounts/transactions ✓      │ │
│  │ [ ] KYC (2)              │  │                                  │ │
│  │ [ ] Webhooks (4)         │  │ Parámetros:                      │ │
│  │                          │  │ ┌─────────────────────────────┐  │ │
│  │ [GetWalletTransactions]  │  │ │ walletId: [123]             │  │ │
│  │ [RetrieveAccounts]       │  │ │ fromDate: [2026-01-01]      │  │ │
│  │ [UpdateWalletDetails]    │  │ │ toDate: [2026-01-31]        │  │ │
│  │ [GetBalance]             │  │ │ limit: [100]                │  │ │
│  │ [GetKycStatus]           │  │ └─────────────────────────────┘  │ │
│  │                          │  │                                  │ │
│  │ [⚙️ Presets]             │  │ [Test] [SaveQuery] [Load...]     │ │
│  │                          │  │                                  │ │
│  └──────────────────────────┘  │ Response:                        │ │
│                                │ ┌─────────────────────────────┐  │ │
│                                │ │ {                           │  │ │
│                                │ │   "status": "OK",           │  │ │
│                                │ │   "transactions": [...]     │  │ │
│                                │ │ }                           │  │ │
│                                │ │                             │  │ │
│                                │ │ Executed: 2026-01-12 20:45  │  │ │
│                                │ │ Duration: 234ms             │  │ │
│                                │ │ Retry Status: none          │  │ │
│                                │ └─────────────────────────────┘  │ │
│                                │                                  │ │
│  Rate Limiting Status:          │ [View Historial] [Full Logs]     │ │
│  ┌──────────────────────────┐   │                                  │ │
│  │ 2/3 slots disponibles    │   │                                  │ │
│  │ Última llamada: 2.3s ago │   │                                  │ │
│  │ Próxima: en 0.7s         │   │                                  │ │
│  └──────────────────────────┘   │                                  │ │
│                                │                                  │ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 9. RESUMEN: Por qué API Explorer Integrado en Opción 2

| Aspecto | Beneficio |
|--------|-----------|
| **Centralización** | Una config, usada por todos (config UI, API explorer, crons, webhooks) |
| **Sincronización** | Cambios instantáneos, sin duplicación |
| **Testing Realista** | Test con config real = descubrimiento de bugs antes |
| **Auditoría** | Todo logged con intent específico |
| **UX** | Un dashboard integrado, no 7 páginas desperdigadas |
| **Mantenibilidad** | Menos código duplicado, lógica centralizada |
| **Escalabilidad** | Fácil agregar nuevos métodos, tipos, queries |

---

**Documento v1.0 - Enero 2026**
