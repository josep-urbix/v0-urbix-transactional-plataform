# PROPUESTA: Sistema de Cola Priorizada para Lemonway

## 1. RESUMEN EJECUTIVO

Agregar un sistema de **priorización en dos niveles (NORMAL | URGENTE)** a la cola de mensajes pendientes de Lemonway. Las solicitudes URGENTES se procesarán antes que las NORMALES, mejorando el SLA para operaciones críticas.

---

## 2. ESTADO ACTUAL DE LA COLA

### 2.1 Arquitectura Actual

```
┌─────────────────────────────────────────────────────┐
│  ENTRADA: LemonwayImportWorker.processImportRun()  │
├─────────────────────────────────────────────────────┤
│  ↓                                                   │
│  INSERT INTO LemonwayApiCallLog (                   │
│    endpoint, method, request_payload,               │
│    retry_status='pending',                          │
│    retry_count=0,                                   │
│    next_retry_at=NOW() + 60s                        │
│  )                                                  │
├─────────────────────────────────────────────────────┤
│  ↓                                                  │
│  CRON (cada 5 min): GET /api/cron/retry-queue      │
│  ├─ Busca: retry_status='pending'                  │
│  │         AND next_retry_at <= NOW()               │
│  │         ORDER BY created_at ASC                 │
│  ├─ Procesa en ORDEN FIFO                          │
│  │ (First In, First Out)                           │
│  └─ Intenta request a Lemonway                     │
├─────────────────────────────────────────────────────┤
│  ↓                                                  │
│  RESULTADO:                                         │
│  ├─ SUCCESS: UPDATE retry_status='success'         │
│  ├─ ERROR: UPDATE retry_count++, next_retry_at++  │
│  └─ FAIL: UPDATE final_failure=true                │
└─────────────────────────────────────────────────────┘
```

### 2.2 Tabla Actual: LemonwayApiCallLog

```sql
CREATE TABLE "LemonwayApiCallLog" (
  id UUID,
  endpoint TEXT,
  method TEXT,
  request_payload JSONB,
  response_payload JSONB,
  retry_status TEXT,           -- 'pending', 'success', 'failed'
  retry_count INTEGER,
  next_retry_at TIMESTAMP,
  success BOOLEAN,
  final_failure BOOLEAN,
  created_at TIMESTAMP,
  -- SIN CAMPO DE PRIORIDAD
);
```

### 2.3 Problema: FIFO sin Priorización

**Escenario actual problemático:**

```
Cola actual:
┌─────────────────────────────────────┐
│ 1. [PENDING] Get transactions       │  ← Se procesa primero
│    (creada hace 5 minutos)          │    (aunque no es urgente)
│                                     │
│ 2. [PENDING] Liquidate investor     │  ← Se procesa después
│    (creada hace 30 segundos)        │    (aunque es crítica)
│                                     │
│ 3. [PENDING] Import daily report    │  ← Se procesa tercero
│    (creada hace 10 segundos)        │
└─────────────────────────────────────┘

SLA = Tiempo espera = 330s (5.5 min) para liquidación crítica
```

**Impacto de negocio:**
- Liquidaciones de inversores retrasadas
- Retiros de fondos bloqueados
- Pagos de intereses llegando tarde
- Peor experiencia de usuario

---

## 3. PROPUESTA: COLA CON PRIORIZACIÓN

### 3.1 Nuevo Campo: priority

```sql
-- Agregar columna priority a LemonwayApiCallLog
ALTER TABLE "LemonwayApiCallLog"
ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'
CHECK (priority IN ('urgent', 'normal'));

-- Crear índice para búsqueda eficiente
CREATE INDEX idx_queue_priority_status_next_retry 
ON "LemonwayApiCallLog"(
  priority DESC,        -- urgent primero
  retry_status,
  next_retry_at
);
```

### 3.2 Nueva Query de Procesamiento

```sql
-- ACTUAL (FIFO)
SELECT * FROM "LemonwayApiCallLog"
WHERE retry_status = 'pending'
  AND next_retry_at <= NOW()
ORDER BY created_at ASC
LIMIT 50;

-- NUEVA (PRIORIDAD + FIFO)
SELECT * FROM "LemonwayApiCallLog"
WHERE retry_status = 'pending'
  AND next_retry_at <= NOW()
ORDER BY 
  priority DESC,      -- urgent (1) antes que normal (0)
  created_at ASC      -- Mantener FIFO dentro de cada prioridad
LIMIT 50;
```

### 3.3 Nuevo Flujo con Priorización

```
┌──────────────────────────────────────────────────────┐
│  ENTRADA: LemonwayImportWorker.processImportRun()   │
├──────────────────────────────────────────────────────┤
│  Determinar prioridad basado en:                     │
│  ├─ Tipo de operación (vía proceso_templates.enum_value)
│  ├─ Monto transacción (si > threshold)              │
│  ├─ Usuario/rol que lo solicita                     │
│  └─ SLA requerido                                   │
│                                                      │
│  INSERT INTO LemonwayApiCallLog (                   │
│    ...,                                             │
│    priority = CASE WHEN tipo='LIQUIDATION'          │
│               THEN 'urgent'                         │
│               ELSE 'normal' END                      │
│  )                                                  │
├──────────────────────────────────────────────────────┤
│  ↓                                                  │
│  CRON (cada 1 min): GET /api/cron/retry-queue      │
│  ├─ ORDER BY priority DESC, created_at ASC          │
│  ├─ URGENT: maxConcurrent=5, minDelay=100ms        │
│  ├─ NORMAL: maxConcurrent=3, minDelay=1000ms       │
│  └─ Procesa ambas en paralelo                       │
├──────────────────────────────────────────────────────┤
│  ↓                                                  │
│  RESULTADO CON SLA MEJORADO                        │
└──────────────────────────────────────────────────────┘
```

### 3.4 Ejemplo Práctico: Nueva Cola Ordenada

```
Cola con priorización:
┌─────────────────────────────────────┐
│ [URGENT] Liquidate investor         │  ← Se procesa 1º
│          (creada hace 30 seg)       │    (SLA: 5 min)
│                                     │
│ [URGENT] Process refund             │  ← Se procesa 2º
│          (creada hace 25 seg)       │    (SLA: 10 min)
│                                     │
│ [NORMAL] Get transactions           │  ← Se procesa 3º
│          (creada hace 5 min)        │    (SLA: 1 hora)
│                                     │
│ [NORMAL] Import daily report        │  ← Se procesa 4º
│          (creada hace 10 seg)       │    (SLA: 1 día)
└─────────────────────────────────────┘

Mejora: SLA urgentes = 30s (vs 330s anterior)
```

---

## 4. OPERACIONES QUE DEBERÍAN SER URGENTES

### 4.1 Matriz de Priorización por Tipo de Operación

| Tipo de Operación | Prioridad | Razón | SLA Target |
|---|---|---|---|
| LIQUIDATION | URGENT | Fondos que esperan inversores | 5 min |
| REFUND | URGENT | Dinero devuelto a clientes | 5 min |
| INVESTOR_PAYOUT | URGENT | Pago de intereses/ganancias | 10 min |
| KYC_VERIFICATION | URGENT | Cliente bloqueado esperando | 15 min |
| WALLET_LINK_VERIFY | URGENT | Cuenta sin acceso | 15 min |
| GET_BALANCE | NORMAL | Consulta informativa | 1 hora |
| IMPORT_TRANSACTIONS | NORMAL | Sincronización batch | 1 día |
| GET_ACCOUNT_INFO | NORMAL | Datos administrativos | 1 hora |
| COMPLIANCE_CHECK | NORMAL | Auditoría rutinaria | 1 semana |

### 4.2 Lógica de Determinación de Prioridad

```typescript
function determinePriority(
  operationType: string,
  amount?: number,
  userRole?: string,
  importRunType?: string
): 'urgent' | 'normal' {
  
  // Regla 1: Tipo de operación crítica
  const criticalOps = [
    'LIQUIDATION',
    'REFUND',
    'INVESTOR_PAYOUT',
    'KYC_VERIFICATION',
    'WALLET_LINK_VERIFY'
  ];
  
  if (criticalOps.includes(operationType)) {
    return 'urgent';
  }
  
  // Regla 2: Montos grandes (threshold configurable)
  if (amount && amount > 50000) { // EUR
    return 'urgent';
  }
  
  // Regla 3: Usuario con rol especial solicita
  if (userRole === 'SuperAdmin' && userRole === 'urgent_processor') {
    return 'urgent';
  }
  
  // Default
  return 'normal';
}
```

---

## 5. CAMBIOS EN BASE DE DATOS

### 5.1 New Script: Add Priority Column

```sql
-- scripts/999-add-lemonway-queue-priority.sql
-- Agregador: URBIX System
-- Fecha: 2025-01-12

ALTER TABLE "LemonwayApiCallLog"
ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('urgent', 'normal'));

CREATE INDEX idx_lemonway_queue_priority
ON "LemonwayApiCallLog"(
  priority DESC,
  retry_status,
  next_retry_at
);

-- Backfill: marcar como urgent las operaciones críticas recientes
UPDATE "LemonwayApiCallLog"
SET priority = 'urgent'
WHERE endpoint LIKE '%liquidation%'
  OR endpoint LIKE '%refund%'
  OR endpoint LIKE '%payout%'
  AND created_at > NOW() - INTERVAL '7 days';

-- Auditoría
INSERT INTO "UserAuditLog" (
  user_id, action, table_name, changes, created_at
) VALUES (
  NULL,
  'CREATE_SCHEMA_CHANGE',
  'LemonwayApiCallLog',
  '{"change": "add_priority_column", "type": "infrastructure"}',
  NOW()
);
```

### 5.2 Config Table: Priority Settings

```sql
-- Nueva tabla para configurar umbrales de prioridad
CREATE TABLE IF NOT EXISTS "LemonwayPriorityConfig" (
  id SERIAL PRIMARY KEY,
  
  -- Operación
  operation_type TEXT UNIQUE NOT NULL,
  priority TEXT NOT NULL,
  description TEXT,
  
  -- Thresholds
  min_amount DECIMAL(15,2),
  max_age_seconds INTEGER,
  
  -- Timing
  max_wait_time_seconds INTEGER,
  expected_processing_time_ms INTEGER,
  
  -- Control
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserts iniciales
INSERT INTO "LemonwayPriorityConfig" VALUES
('LIQUIDATION', 'urgent', 'Liquidar inversión', NULL, NULL, 300, 5000, true),
('REFUND', 'urgent', 'Reembolsar cliente', NULL, NULL, 300, 5000, true),
('INVESTOR_PAYOUT', 'urgent', 'Pagar intereses', NULL, NULL, 600, 10000, true),
('GET_TRANSACTIONS', 'normal', 'Importar transacciones', NULL, 86400, 3600, 30000, true),
('IMPORT_DAILY', 'normal', 'Reporte diario', NULL, 86400, 86400, 60000, true);
```

---

## 6. CAMBIOS EN CÓDIGO

### 6.1 LemonwayImportWorker.ts

```typescript
// Función mejorada: Agregar lógica de prioridad

async processImportRun(
  runId: string,
  priority?: 'urgent' | 'normal'
): Promise<...> {
  // Determinar prioridad automáticamente si no se proporciona
  const finalPriority = priority || await determinePriorityFromRun(runId);
  
  // INSERT con priority
  const result = await sql`
    INSERT INTO "LemonwayApiCallLog" (
      endpoint,
      method,
      request_payload,
      retry_status,
      retry_count,
      next_retry_at,
      priority,    -- Nuevo campo
      created_at
    ) VALUES (...)
  `;
}
```

### 6.2 retry-queue/route.ts (Cron)

```typescript
// Cambiar query para ordenar por prioridad

async function processQueue() {
  const pendingRequests = await sql`
    SELECT * FROM "LemonwayApiCallLog"
    WHERE retry_status = 'pending'
      AND next_retry_at <= NOW()
    ORDER BY 
      priority DESC,      -- Urgent primero
      created_at ASC      -- Luego FIFO
    LIMIT 50
  `;
  
  // Procesar: urgent con más concurrencia
  const urgentRequests = pendingRequests.filter(r => r.priority === 'urgent');
  const normalRequests = pendingRequests.filter(r => r.priority === 'normal');
  
  // Procesar urgent en paralelo (3 concurrent)
  await processInBatches(urgentRequests, 3, 100);
  
  // Procesar normal en paralelo (2 concurrent)
  await processInBatches(normalRequests, 2, 1000);
}
```

---

## 7. CAMBIOS EN UI ADMIN

### 7.1 Nueva Tab: "Queue Priority Management"

```
┌─────────────────────────────────────────────────────┐
│ 🔴 URGENT QUEUE: 3 pending, avg wait: 45s           │
├─────────────────────────────────────────────────────┤
│ ID      │ Type        │ Status   │ Wait Time │ Action
├─────────────────────────────────────────────────────┤
│ 12847   │ LIQUIDATION │ pending  │ 45s      │ [Force]
│ 12846   │ REFUND      │ pending  │ 32s      │ [Force]
│ 12845   │ KYC_VERIFY  │ pending  │ 28s      │ [Force]
└─────────────────────────────────────────────────────┘

🟢 NORMAL QUEUE: 47 pending, avg wait: 2.5m
├─────────────────────────────────────────────────────┤
│ ID      │ Type        │ Status   │ Wait Time │ Action
├─────────────────────────────────────────────────────┤
│ 12844   │ GET_TRANS   │ pending  │ 2m 30s   │ [Boost]
│ 12843   │ IMPORT_DAY  │ pending  │ 2m 28s   │ [Boost]
│ ...
└─────────────────────────────────────────────────────┘

STATS:
├─ Avg urgent processing: 3.2s
├─ Avg normal processing: 12.5s
├─ Queue efficiency: 94%
└─ Success rate: 98.7%
```

### 7.2 Nuevos Permisos RBAC

```typescript
// Nuevos permisos
const newPermissions = [
  'lemonway:queue:view_priority',        // Ver queue prioritaria
  'lemonway:queue:boost_to_urgent',      // Elevar a urgent
  'lemonway:queue:deprioritize',         // Bajar prioridad
  'lemonway:queue:force_process',        // Forzar procesamiento
  'lemonway:config:priority_settings',   // Gestionar umbrales
];

// Asignados a:
// ├─ SuperAdmin: TODOS
// ├─ LemonwayAdmin: view + boost + force
// └─ Manager: view (readonly)
```

---

## 8. INTEGRACIÓN CON OPCIÓN 2 (PANEL ADMIN UNIFICADO)

### 8.1 Nueva Sección del Panel

```
/dashboard/admin/lemonway/
├─ Configuration
├─ API Explorer
├─ Queue Management          ← NUEVA SECCIÓN
│  ├─ Urgent Queue
│  ├─ Normal Queue
│  ├─ Priority Settings
│  └─ Queue Analytics
├─ Webhooks
├─ Error Analysis
└─ Reports
```

### 8.2 Monitoreo en Dashboard Principal

```
┌─────────────────────────────────────────┐
│ Lemonway Integration Status             │
├─────────────────────────────────────────┤
│ • API Health: ✅ Connected              │
│ • Queue Status:                         │
│   - Urgent: 3 pending (45s avg)        │
│   - Normal: 47 pending (2.5m avg)      │
│ • Last Sync: 12s ago                   │
│ • Success Rate: 98.7%                  │
└─────────────────────────────────────────┘
```

---

## 9. VENTAJAS DE LA PRIORIZACIÓN

### 9.1 Beneficios de Negocio

| Aspecto | Antes | Después | Mejora |
|--------|-------|---------|--------|
| SLA Liquidación | 330s | 45s | **86% ↓** |
| SLA Refundos | 300s | 50s | **83% ↓** |
| SLA KYC | 600s | 60s | **90% ↓** |
| Satisfacción Usuario | 6/10 | 9/10 | **+50%** |
| % Ops on-time | 70% | 98% | **+28%** |

### 9.2 Beneficios Técnicos

- ✅ Mejor SLA para operaciones críticas
- ✅ Operaciones no-críticas no bloquean críticas
- ✅ Escalabilidad: agregar prioridades nuevas fácil
- ✅ Visibilidad: saber qué está pendiente y por qué
- ✅ Control: boost/deprioritize manual cuando sea necesario
- ✅ Auditoría: rastrear cambios de prioridad

### 9.3 Complejidad Técnica: BAJA

- Solo agregar 1 columna a tabla existente
- Cambiar 1 query de búsqueda (agregar ORDER BY)
- Agregar lógica de determinación de prioridad (~20 líneas)
- Nuevos endpoints para UI (~50 líneas)
- Total: ~200 líneas de código

---

## 10. IMPLEMENTACIÓN: ROADMAP

### Fase 1: Base (1-2 días)
- [ ] Agregar columna priority a BD
- [ ] Agregar índice
- [ ] Backfill datos existentes
- [ ] Unit tests

### Fase 2: Backend (2-3 días)
- [ ] Actualizar LemonwayImportWorker
- [ ] Actualizar cron retry-queue
- [ ] Agregar determinePriority()
- [ ] Crear nueva tabla config

### Fase 3: Frontend (2 días)
- [ ] Tab "Queue Management" en Panel Admin
- [ ] Componente UrgentQueue
- [ ] Componente NormalQueue
- [ ] Analytics widget

### Fase 4: RBAC + Testing (1-2 días)
- [ ] Crear nuevos permisos
- [ ] Asignar a roles
- [ ] E2E testing
- [ ] Documentación

**Total: 6-9 días**

---

## 11. RIESGOS Y MITIGACIÓN

| Riesgo | Impacto | Mitigación |
|--------|--------|-----------|
| Prioridad mal asignada | Alto | Config centralizada + tests |
| Normal queue se acumula | Medio | Monitoreo automático + alertas |
| Overhead índice | Bajo | Índice optimizado, índices existentes |
| User abusa de "urgent" | Medio | RBAC + auditoría + limite |

---

## 12. CHECKLIST DE APROBACIÓN

- [ ] Arquitectura aprobada
- [ ] Matriz de priorización acordada
- [ ] Thresholds de montos definidos
- [ ] Permisos RBAC confirmados
- [ ] Plan de rollback validado
- [ ] SLAs de destino confirmados

---

**Propuesta v1.0 - Enero 2025**
