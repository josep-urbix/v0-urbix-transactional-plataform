# Integración de Queries Lemonway Existentes en OPCIÓN 2

## DIAGNÓSTICO: Estado Actual de las Queries

### ✅ 10 Métodos Core Implementados en `LemonwayClient`:
1. **getBearerToken()** - OAuth 2.0 (líneas 105-160)
2. **getAccountDetails(accountId)** - Detalles de cuenta
3. **getAccountsByIds(accountIds[])** - Múltiples cuentas
4. **getTransactions(walletId, startDate, endDate)** - Historial completo
5. **getAccountTransactions(accountId, startDate, endDate)** - Por cuenta
6. **getKycStatus(walletId?)** - Estado KYC/AML
7. **getAccountBalances(walletIds[]?)** - Saldos
8. **getWalletTransactions()** - Específico de wallet
9. **syncAccountFromResponse()** - Sincronización automática
10. **processAndSaveTransactions()** - Procesar y guardar

### ✅ BD Centralizada ya Existe:
- **`LemonwayConfig`** - Almacena OAuth token, walletId, environment
- **`LemonwayApiMethod`** - Registra 10+ métodos con schemas
- **`LemonwayApiCallLog`** - Auditoría de TODAS las llamadas
- **`LemonwayRetryConfig`** - Reintentos automáticos
- **`MappedFields`** - Mapeo de campos dinámico

---

## ESTRATEGIA: Reutilización sin Duplicados

### OPCIÓN 2 DEBE:

#### 1. **NO DUPLICAR el LemonwayClient**
\`\`\`typescript
// ❌ MAL: Crear nuevo cliente duplicado
const client = new LemonwayClient(config)

// ✅ BIEN: Reutilizar desde donde ya existe
import LemonwayClient from "@/lib/lemonway-client"
const client = new LemonwayClient(await LemonwayClient.getConfig())
\`\`\`

#### 2. **Exponer Métodos Disponibles en Tab "Available Methods"**
- Mostrar los 10 métodos ya implementados
- Extraer desde `LemonwayApiMethod` table
- Mostrar schema, ejemplo request/response
- Permitir ejecutar directamente desde UI

#### 3. **Custom Queries = Presets de Métodos**
No son queries nuevas, sino **configuraciones guardadas** de los 10 métodos existentes:
\`\`\`typescript
interface CustomQuery {
  id: string
  name: string              // e.g., "Get all wallet transactions daily"
  method_id: string         // FK a LemonwayApiMethod
  parameters: {             // Parámetros preestablecidos
    walletId?: string
    startDate?: string
    endDate?: string
  }
  created_by: string
  is_favorite: boolean
}
\`\`\`

#### 4. **Integrar Queue FIFO Dual**
Cada ejecución de cualquier método pasa por la cola:
\`\`\`typescript
// Cuando ejecuta getBearerToken() o getTransactions()
→ Enqueue en lemonway_request_queue (URGENT o NORMAL)
→ Procesador FIFO dual elige si ejecutar ahora o esperar
→ Registro en LemonwayApiCallLog (ya existe)
\`\`\`

#### 5. **Reutilizar Auditoría Existente**
- NO crear nueva tabla de auditoría
- Usar `LemonwayApiCallLog` que ya está configurada
- Dashboard OPCIÓN 2 solo **visualiza** lo que ya existe

#### 6. **Sandbox Mode = Dry-Run sin Afectar BD**
\`\`\`typescript
// Cuando sandbox = true:
→ Ejecutar LemonwayClient como normalmente
→ Capturar response
→ NO guardar en MovimientosCuenta
→ Mostrar respuesta en modo preview
→ Guardar en tabla separada: lemonway_sandbox_history
\`\`\`

---

## ARQUITECTURA FÍSICA: Tablas que USA OPCIÓN 2

### Existentes (NO TOCAR):
- `LemonwayConfig` - Configuración
- `LemonwayApiMethod` - 10 métodos
- `LemonwayApiCallLog` - Auditoría
- `LemonwayRetryConfig` - Reintentos
- `MappedFields` - Mapeo campos
- `MovimientosCuenta` - Transacciones

### Nuevas SOLO para OPCIÓN 2:
- `lemonway_request_queue` - Cola dual FIFO (URGENT/NORMAL)
- `lemonway_custom_queries` - Presets de métodos
- `lemonway_operation_types` - Clasificación de operaciones
- `lemonway_sandbox_history` - Dry-run history
- `lemonway_snapshots` - Comparaciones request/response
- `lemonway_query_versions` - Histórico de cambios en presets

---

## FLUJOS END-TO-END: Cómo Funciona sin Duplicar

### FLUJO 1: Ejecutar Método Existente
\`\`\`
Usuario en OPCIÓN 2
  ↓
Selecciona "Get Wallet Transactions" (método existente)
  ↓
Completa parámetros (walletId, startDate, endDate)
  ↓
Click "Execute"
  ↓
Enqueue en lemonway_request_queue (prioridad: NORMAL)
  ↓
Procesador FIFO extrae de cola
  ↓
Llama LemonwayClient.getTransactions()
  ↓
Resultado registrado en LemonwayApiCallLog (auditoria actual)
  ↓
Mostrar respuesta en UI con visualización mejorada
\`\`\`

### FLUJO 2: Guardar como Custom Query (Preset)
\`\`\`
Usuario ejecutó getBearerToken() con params específicos
  ↓
Click "Save as Preset"
  ↓
Guardar en lemonway_custom_queries:
  - name: "Diario Bearer Token"
  - method_id: "getBearerToken"
  - parameters: { executeAt: "08:00" }
  - created_by: user_id
  ↓
Próximas ejecuciones reutilizan estos parámetros
\`\`\`

### FLUJO 3: Ejecución desde Sandbox (Dry-run)
\`\`\`
Usuario quiere testear getTransactions sin afectar BD
  ↓
Toggle "Sandbox Mode" ON
  ↓
Ejecuta LemonwayClient.getTransactions() normalmente
  ↓
Response se captura pero NO se guarda en MovimientosCuenta
  ↓
Registra en lemonway_sandbox_history para auditoría
  ↓
Mostrar diferencias si es segunda ejecución
\`\`\`

---

## CAMBIOS EN CÓDIGO: Mínimos y Quirúrgicos

### En `app/api/admin/lemonway/queue/route.ts`:
\`\`\`typescript
// REUTILIZAR: LemonwayClient existente
import { LemonwayClient } from "@/lib/lemonway-client"

// El endpoint SOLO orquesta el flujo:
1. Lee cola desde BD
2. Obtiene método desde LemonwayApiMethod
3. Ejecuta LemonwayClient[metodName](params)
4. El cliente maneja OAuth, retry, logging automáticamente
\`\`\`

### En `components/lemonway-admin/api-explorer-tab.tsx`:
\`\`\`typescript
// REUTILIZAR: Lista de métodos de BD
const methods = await fetch('/api/lemonway-api/methods')
  .then(r => r.json())
  .then(d => d.methods) // Array de LemonwayApiMethod

// REUTILIZAR: Schemas de request/response para generar formularios
const schema = method.request_schema // Ya tiene structure!
const formComponent = generateFormFromSchema(schema)
\`\`\`

---

## TABLA RESUMIDA: Qué Reutilizar vs Qué Crear

| Sistema | Acción | Razón |
|---------|--------|-------|
| LemonwayClient | ✅ Reutilizar | Contiene 10 métodos funcionales |
| LemonwayConfig | ✅ Reutilizar | Toda config centralizada aquí |
| LemonwayApiMethod | ✅ Reutilizar | Schema y ejemplos para UI |
| LemonwayApiCallLog | ✅ Reutilizar | Auditoría ya completa |
| lemonway_request_queue | ✨ CREAR | Cola FIFO dual (nueva funcionalidad) |
| lemonway_custom_queries | ✨ CREAR | Presets de métodos (nueva) |
| lemonway_operation_types | ✨ CREAR | Clasificación (nueva) |
| lemonway_sandbox_history | ✨ CREAR | Dry-run tracking (nueva) |
| lemonway_snapshots | ✨ CREAR | Comparaciones (nueva mejora) |
| Tabla de Versiones | ✨ CREAR | Histórico de cambios (nueva mejora) |

---

## BENEFICIOS DE ESTA INTEGRACIÓN

✅ **CERO duplicación de código** - Reutiliza 100% del cliente existente
✅ **Reutiliza auditoría actual** - Todo registrado en LemonwayApiCallLog  
✅ **Sincronización automática** - El procesador FIFO usa LemonwayClient.processAndSaveTransactions()
✅ **Mantiene seguridad actual** - OAuth, retry, rate limiting del cliente existente
✅ **Escala sin refactor** - Solo agrega capa de orquestación (cola + presets)
✅ **Testing realista** - Sandbox mode usa mismo cliente que producción

---

## PRÓXIMOS PASOS

1. Ejecutar script 145 para crear tablas nuevas
2. Crear endpoint `/api/admin/lemonway/available-methods` que liste métodos de BD
3. Modificar endpoint `/api/admin/lemonway/queue/route.ts` para ejecutar métodos reutilizando LemonwayClient
4. Crear tab "Available Methods" que muestre métodos con esquemas
5. Crear componente "CustomQueries" que gestione presets
6. Integrar sandbox mode en API Explorer sin duplicar lógica
