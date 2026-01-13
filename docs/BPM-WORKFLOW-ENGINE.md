# MÓDULO BPM - Business Process Management
## Motor de Flujos de Trabajo (Workflow Engine)

**Versión:** 1.0  
**Última actualización:** 2026-01-08

---

## 📋 TABLA DE CONTENIDOS

1. [Introducción](#introducción)
2. [Arquitectura General](#arquitectura-general)
3. [Modelo de Datos](#modelo-de-datos)
4. [Motor de Ejecución](#motor-de-ejecución)
5. [Tipos de Pasos (Step Handlers)](#tipos-de-pasos-step-handlers)
6. [Template Engine](#template-engine)
7. [APIs REST](#apis-rest)
8. [Componentes UI](#componentes-ui)
9. [Eventos y Triggers](#eventos-y-triggers)
10. [Ejemplos de Uso](#ejemplos-de-uso)
11. [Troubleshooting](#troubleshooting)

---

## 🎯 INTRODUCCIÓN

El **Módulo BPM** es un motor de flujos de trabajo (workflow engine) completo que permite:

- ✅ Automatizar procesos de negocio mediante flujos visuales
- ✅ Responder a eventos del sistema (triggers)
- ✅ Ejecutar acciones secuenciales con reintentos automáticos
- ✅ Bifurcar lógica según condiciones
- ✅ Integrar con APIs internas y externas (webhooks)
- ✅ Enviar emails automáticos
- ✅ Pausar y reanudar ejecuciones
- ✅ Auditoría completa de todas las ejecuciones

### Casos de Uso

- **Onboarding de usuarios**: Email de bienvenida → Asignar tareas → Notificar al equipo
- **KYC/Verificación**: Validar documentos → Llamar a API de verificación → Aprobar/Rechazar
- **Inversiones**: Crear inversión → Procesar pago → Actualizar wallet → Notificar
- **Proyectos**: Nuevo proyecto → Validar datos → Asignar promotor → Publicar
- **Notificaciones**: Trigger evento → Evaluar condiciones → Enviar email/SMS/webhook

---

## 🏗️ ARQUITECTURA GENERAL

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                      WORKFLOW ENGINE                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │   Triggers   │ ──────► │ Workflow Run │                  │
│  │  (Eventos)   │         │  (Ejecución) │                  │
│  └──────────────┘         └──────┬───────┘                  │
│                                   │                          │
│                          ┌────────▼────────┐                 │
│                          │  Motor de       │                 │
│                          │  Ejecución      │                 │
│                          └────────┬────────┘                 │
│                                   │                          │
│              ┌────────────────────┼────────────────────┐     │
│              │                    │                    │     │
│       ┌──────▼──────┐   ┌────────▼────────┐  ┌───────▼──┐  │
│       │ Step Handler│   │ Step Handler    │  │  Step    │  │
│       │ SEND_EMAIL  │   │ CALL_WEBHOOK    │  │ Handler  │  │
│       └─────────────┘   └─────────────────┘  └──────────┘  │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Template Engine                             │  │
│  │  (Sustitución de variables {{context.user.email}})   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                           │                    │
         ▼                           ▼                    ▼
   ┌──────────┐             ┌──────────────┐      ┌──────────┐
   │ Database │             │  APIs (REST) │      │ UI/Editor│
   │ (Schema  │             │              │      │          │
   │ workflows│             └──────────────┘      └──────────┘
   └──────────┘
\`\`\`

### Componentes Principales

1. **Motor de Ejecución** (`lib/workflow-engine/engine.ts`)
   - Orquesta la ejecución de workflows
   - Maneja reintentos, delays y control de flujo
   - Persiste contexto en cada paso

2. **Step Handlers** (`lib/workflow-engine/step-handlers.ts`)
   - Implementaciones de cada tipo de acción
   - 7 tipos: API, Webhook, Email, Delay, Conditional, Variable, Log

3. **Template Engine** (`lib/workflow-engine/template-engine.ts`)
   - Sistema de sustitución de variables `{{trigger.email}}`
   - Evaluación de condiciones booleanas
   - Parsing de duraciones ISO 8601

4. **APIs REST** (`app/api/workflows/**`)
   - Gestión CRUD de workflows
   - Emisión de eventos
   - Consulta de ejecuciones

5. **Componentes UI** (`components/workflows/**`)
   - Editor visual de workflows
   - Listado y filtros
   - Detalle de ejecuciones con timeline

---

## 🗄️ MODELO DE DATOS

### Schema: `workflows`

#### Tabla: `Workflow`

Definición de un flujo de trabajo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `name` | VARCHAR(255) | Nombre del workflow |
| `description` | TEXT | Descripción opcional |
| `status` | VARCHAR(20) | `ACTIVE` \| `INACTIVE` |
| `version` | INTEGER | Versión del workflow (default: 1) |
| `canvas_data` | JSONB | Metadata del editor visual (posiciones, zoom) |
| `entry_step_key` | VARCHAR(100) | Key del primer paso a ejecutar |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización |

**Índices:**
- `idx_workflow_status` ON `(status)`
- `idx_workflow_name` ON `(name)`

---

#### Tabla: `WorkflowTrigger`

Eventos que disparan la ejecución de un workflow.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `workflow_id` | UUID | FK → `Workflow(id)` |
| `event_name` | VARCHAR(100) | Nombre del evento (ej: `USER_REGISTERED`) |
| `filter_expression` | TEXT | Expresión opcional para filtrar payloads |
| `description` | TEXT | Descripción legible |
| `is_active` | BOOLEAN | Si el trigger está activo (default: true) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Fecha de actualización |

**Índices:**
- `idx_trigger_event` ON `(event_name)`
- `idx_trigger_workflow` ON `(workflow_id)`

**Ejemplo de `filter_expression`:**
\`\`\`javascript
{{trigger.amount}} > 1000 && {{trigger.status}} == "paid"
\`\`\`

---

#### Tabla: `WorkflowStep`

Pasos individuales de un workflow.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `workflow_id` | UUID | FK → `Workflow(id)` |
| `step_key` | VARCHAR(100) | Key única dentro del workflow (ej: `send_email`) |
| `name` | VARCHAR(255) | Nombre legible del paso |
| `type` | VARCHAR(50) | Tipo de paso (ver tipos disponibles) |
| `config` | JSONB | Configuración específica del tipo |
| `next_step_on_success` | VARCHAR(100) | Key del siguiente paso si success |
| `next_step_on_error` | VARCHAR(100) | Key del siguiente paso si error |
| `max_retries` | INTEGER | Número máximo de reintentos (default: 3) |
| `retry_delay_ms` | INTEGER | Delay entre reintentos en ms (default: 1000) |
| `retry_backoff_multiplier` | NUMERIC(3,1) | Multiplicador exponencial (default: 2.0) |
| `position_x` | INTEGER | Posición X en el canvas (default: 0) |
| `position_y` | INTEGER | Posición Y en el canvas (default: 0) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Fecha de actualización |

**Constraint:**
- `UNIQUE (workflow_id, step_key)`

**Índices:**
- `idx_step_workflow` ON `(workflow_id)`
- `idx_step_type` ON `(type)`

**Tipos de pasos disponibles:**
- `CALL_INTERNAL_API`
- `CALL_WEBHOOK`
- `SEND_EMAIL`
- `DELAY`
- `CONDITIONAL`
- `SET_VARIABLE`
- `LOG`

---

#### Tabla: `WorkflowRun`

Instancia de ejecución de un workflow.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `workflow_id` | UUID | FK → `Workflow(id)` |
| `status` | VARCHAR(20) | Estado de la ejecución |
| `trigger_event_name` | VARCHAR(100) | Nombre del evento que disparó el workflow |
| `trigger_payload` | JSONB | Payload original del evento |
| `context` | JSONB | Contexto acumulado durante la ejecución |
| `current_step_key` | VARCHAR(100) | Key del paso actual |
| `error_message` | TEXT | Mensaje de error si falló |
| `error_stack` | TEXT | Stack trace del error |
| `started_at` | TIMESTAMPTZ | Fecha/hora de inicio |
| `finished_at` | TIMESTAMPTZ | Fecha/hora de fin (NULL si aún ejecutando) |
| `resume_at` | TIMESTAMPTZ | Fecha/hora para reanudar (delays) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

**Estados posibles:**
- `PENDING`: Creado pero no iniciado
- `RUNNING`: Ejecutando actualmente
- `COMPLETED`: Finalizado exitosamente
- `FAILED`: Falló (sin más reintentos)
- `CANCELLED`: Cancelado manualmente
- `WAITING`: Esperando (delay o retry programado)

**Índices:**
- `idx_run_workflow` ON `(workflow_id)`
- `idx_run_status` ON `(status)`
- `idx_run_started` ON `(started_at DESC)`
- `idx_run_resume` ON `(resume_at)` WHERE `resume_at IS NOT NULL`

---

#### Tabla: `WorkflowStepRun`

Historial de ejecución de pasos individuales.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `workflow_run_id` | UUID | FK → `WorkflowRun(id)` |
| `step_id` | UUID | FK → `WorkflowStep(id)` |
| `step_key` | VARCHAR(100) | Key del paso |
| `status` | VARCHAR(20) | Estado del paso |
| `attempt_number` | INTEGER | Número de intento actual (default: 1) |
| `max_attempts` | INTEGER | Máximo de intentos (default: 3) |
| `input_data` | JSONB | Datos de entrada del paso |
| `output_data` | JSONB | Datos de salida del paso |
| `error_message` | TEXT | Mensaje de error |
| `error_stack` | TEXT | Stack trace del error |
| `is_retriable` | BOOLEAN | Si el error es retriable (default: true) |
| `started_at` | TIMESTAMPTZ | Inicio del intento |
| `finished_at` | TIMESTAMPTZ | Fin del intento |
| `next_retry_at` | TIMESTAMPTZ | Cuándo se reintentará |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

**Estados posibles:**
- `PENDING`: Pendiente
- `RUNNING`: Ejecutando
- `COMPLETED`: Completado
- `FAILED`: Falló
- `SKIPPED`: Omitido (condicional)
- `WAITING`: Esperando retry

**Índices:**
- `idx_steprun_run` ON `(workflow_run_id)`
- `idx_steprun_step` ON `(step_id)`
- `idx_steprun_status` ON `(status)`
- `idx_steprun_retry` ON `(next_retry_at)` WHERE `next_retry_at IS NOT NULL`

---

#### Tabla: `WorkflowEvent`

Registro de tipos de eventos conocidos.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Identificador único |
| `event_name` | VARCHAR(100) | Nombre único del evento |
| `description` | TEXT | Descripción del evento |
| `payload_schema` | JSONB | Schema JSON del payload esperado |
| `category` | VARCHAR(50) | Categoría (users, kyc, investments, etc.) |
| `is_active` | BOOLEAN | Si el evento está activo |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Fecha de actualización |

**Constraint:**
- `UNIQUE (event_name)`

**Eventos predefinidos (seed):**

| Categoría | Eventos |
|-----------|---------|
| `users` | USER_REGISTERED, USER_EMAIL_VERIFIED |
| `kyc` | KYC_SUBMITTED, KYC_APPROVED, KYC_REJECTED |
| `investments` | INVESTMENT_CREATED, INVESTMENT_PAID, INVESTMENT_CANCELLED |
| `projects` | PROJECT_CREATED, PROJECT_UPDATED, PROJECT_FUNDED |
| `lemonway` | WALLET_CREATED, WALLET_CREDITED, WALLET_DEBITED, TRANSFER_COMPLETED |
| `webhooks` | WEBHOOK_RECEIVED |
| `system` | SCHEDULED_TRIGGER, MANUAL_TRIGGER |

---

## ⚙️ MOTOR DE EJECUCIÓN

### Archivo: `lib/workflow-engine/engine.ts`

### Flujo de Ejecución Completo

\`\`\`
1. emitEvent(eventName, payload)
   ├─→ Busca workflows ACTIVE con triggers que coincidan
   ├─→ Evalúa filter_expression (si existe)
   └─→ Para cada workflow coincidente:
       └─→ createWorkflowRun()

2. createWorkflowRun(workflowId, eventName, payload)
   ├─→ Crea registro en WorkflowRun
   ├─→ Inicializa contexto con payload
   └─→ Ejecuta executeWorkflowRun() (async)

3. executeWorkflowRun(runId)
   ├─→ Obtiene workflow completo con steps
   ├─→ LOOP: Mientras haya current_step_key
   │   ├─→ Obtiene step actual
   │   ├─→ executeStep(runId, step, context)
   │   │   ├─→ Crea WorkflowStepRun
   │   │   ├─→ Procesa config con templates
   │   │   ├─→ Obtiene handler según step.type
   │   │   ├─→ Ejecuta handler
   │   │   │   ├─→ SUCCESS:
   │   │   │   │   ├─→ Guarda output en context.steps[step_key]
   │   │   │   │   ├─→ Si delayMs > 30000: WAITING + resume_at
   │   │   │   │   └─→ next_step = next_step_on_success
   │   │   │   └─→ FAILURE:
   │   │   │       ├─→ Si attempt < max_retries && isRetriable:
   │   │   │       │   ├─→ Calcula backoff delay
   │   │   │       │   ├─→ WAITING + next_retry_at
   │   │   │       │   └─→ return (espera cron para reanudar)
   │   │   │       └─→ else:
   │   │   │           ├─→ next_step = next_step_on_error
   │   │   │           └─→ Si no existe: FAILED (workflow)
   │   │   └─→ Actualiza context en WorkflowRun
   │   └─→ Actualiza current_step_key
   └─→ Si no hay más steps: COMPLETED

4. resumeWaitingWorkflows() [Cron Job]
   ├─→ Busca WorkflowRun con status=WAITING y resume_at <= NOW
   └─→ Para cada una: executeWorkflowRun(runId)
\`\`\`

### Funciones Principales

#### `emitEvent(eventName: string, payload: Record<string, unknown>)`

Punto de entrada principal. Dispara workflows que escuchan el evento.

**Parámetros:**
- `eventName`: Nombre del evento (ej: "USER_REGISTERED")
- `payload`: Datos del evento

**Retorna:**
\`\`\`typescript
{
  triggered: number       // Número de workflows disparados
  runIds: string[]        // IDs de las ejecuciones creadas
}
\`\`\`

**Ejemplo:**
\`\`\`typescript
import { emitEvent } from "@/lib/workflow-engine/engine"

await emitEvent("USER_REGISTERED", {
  email: "user@example.com",
  name: "John Doe",
  userId: "uuid"
})
\`\`\`

---

#### `createWorkflowRun(workflowId, eventName, payload)`

Crea una nueva ejecución de workflow.

**Proceso:**
1. Valida que el workflow exista y esté ACTIVE
2. Crea registro en `WorkflowRun`
3. Inicializa contexto
4. Ejecuta de forma asíncrona

---

#### `executeWorkflowRun(runId: string)`

Ejecuta un workflow completo iterando por los pasos.

**Lógica:**
- Obtiene workflow y sus steps
- Itera desde `entry_step_key`
- Ejecuta cada paso
- Determina siguiente paso según resultado
- Maneja delays programados (WAITING)
- Finaliza con COMPLETED o FAILED

---

#### `executeStep(runId, step, context)`

Ejecuta un paso individual con lógica de reintentos.

**Proceso:**
1. Crea `WorkflowStepRun` con attempt_number
2. Procesa templates en config
3. Obtiene handler apropiado
4. Ejecuta handler
5. Si falla y es retriable:
   - Calcula delay con backoff exponencial
   - Marca como WAITING con next_retry_at
6. Si falla y NO es retriable:
   - Va a next_step_on_error (si existe)
   - O marca workflow como FAILED
7. Si success:
   - Guarda output en context
   - Va a next_step_on_success

**Fórmula de backoff:**
\`\`\`
delay = retry_delay_ms * Math.pow(retry_backoff_multiplier, attempt_number - 1)
\`\`\`

**Ejemplo con default:**
- Intento 1: 1000ms
- Intento 2: 2000ms (1000 * 2^1)
- Intento 3: 4000ms (1000 * 2^2)

---

#### `resumeWaitingWorkflows()`

Reanuda workflows en pausa. **Debe ejecutarse periódicamente (cron).**

**Proceso:**
1. Busca `WorkflowRun` con:
   - `status = 'WAITING'`
   - `resume_at <= NOW()`
2. Para cada una:
   - Cambia status a RUNNING
   - Llama a `executeWorkflowRun(runId)`

**Configuración recomendada:**
- Ejecutar cada 30-60 segundos
- Usar Next.js Cron API o sistema externo

---

### Contexto de Ejecución (WorkflowContext)

El contexto es un objeto JSON que se pasa entre pasos y almacena datos.

\`\`\`typescript
interface WorkflowContext {
  // Payload original del evento
  trigger: Record<string, unknown>
  
  // Outputs de cada paso ejecutado
  steps: {
    [step_key]: output_data
  }
  
  // Variables personalizadas
  variables: {
    [varName]: value
  }
  
  // Metadata
  _meta: {
    workflow_id: string
    workflow_run_id: string
    started_at: string
    current_step?: string
  }
}
\`\`\`

**Ejemplo de contexto después de 2 pasos:**

\`\`\`json
{
  "trigger": {
    "email": "user@example.com",
    "userId": "123"
  },
  "steps": {
    "call_api": {
      "status": 200,
      "data": { "id": "inv-456", "amount": 1000 }
    },
    "send_email": {
      "messageId": "<msg@gmail.com>",
      "emailSendId": "789"
    }
  },
  "variables": {
    "investmentId": "inv-456"
  },
  "_meta": {
    "workflow_id": "wf-abc",
    "workflow_run_id": "run-xyz",
    "started_at": "2026-01-08T10:00:00Z",
    "current_step": "send_email"
  }
}
\`\`\`

---

## 🔌 TIPOS DE PASOS (Step Handlers)

### Archivo: `lib/workflow-engine/step-handlers.ts`

### 1. CALL_INTERNAL_API

Llama a endpoints internos de la aplicación.

**Config:**
\`\`\`typescript
{
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  urlPath: string                          // Soporta templates
  headersTemplate?: Record<string, string> // Opcional
  bodyTemplate?: Record<string, any> | string  // Para POST/PUT/PATCH
  expectedStatusCodes?: number[]           // Default: [200, 201, 204]
  outputVariable?: string                  // Para guardar en variables
}
\`\`\`

**Ejemplo:**
\`\`\`json
{
  "method": "POST",
  "urlPath": "/api/investments",
  "bodyTemplate": {
    "userId": "{{trigger.userId}}",
    "amount": "{{trigger.amount}}",
    "projectId": "{{context.project.id}}"
  },
  "expectedStatusCodes": [200, 201]
}
\`\`\`

**Output:**
\`\`\`json
{
  "status": 201,
  "data": {
    "id": "inv-123",
    "createdAt": "2026-01-08T10:00:00Z"
  }
}
\`\`\`

**Headers automáticos:**
- `Content-Type: application/json`
- `X-Workflow-Run-Id: <run_id>`

**Retriable:**
- ✅ Si status >= 500 o 429 (rate limit)
- ❌ Si status 4xx (excepto 429)

---

### 2. CALL_WEBHOOK

Llama a webhooks externos.

**Config:**
\`\`\`typescript
{
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  url: string                              // URL completa, soporta templates
  headersTemplate?: Record<string, string>
  bodyTemplate?: Record<string, any> | string
  expectedStatusCodes?: number[]           // Default: [200, 201, 202, 204]
  timeoutMs?: number                       // Default: 30000 (30s)
}
\`\`\`

**Ejemplo:**
\`\`\`json
{
  "method": "POST",
  "url": "https://hooks.slack.com/services/{{variables.slackWebhook}}",
  "bodyTemplate": {
    "text": "Nueva inversión de {{trigger.userName}}: €{{trigger.amount}}"
  },
  "timeoutMs": 10000
}
\`\`\`

**Diferencias con CALL_INTERNAL_API:**
- Permite URLs externas completas
- Timeout configurable
- No agrega baseUrl

**Retriable:**
- ✅ Siempre (errores de red, timeouts, 5xx)

---

### 3. SEND_EMAIL

Envía emails usando plantillas de Gmail.

**Config:**
\`\`\`typescript
{
  templateKey: string                     // Key de la plantilla en DB
  toTemplate: string                      // Email destino, soporta templates
  ccTemplate?: string                     // CC opcional
  bccTemplate?: string                    // BCC opcional
  variablesTemplate?: Record<string, string>  // Variables para la plantilla
}
\`\`\`

**Ejemplo:**
\`\`\`json
{
  "templateKey": "welcome",
  "toTemplate": "{{trigger.email}}",
  "variablesTemplate": {
    "userName": "{{trigger.name}}",
    "loginUrl": "https://urbix.es/login"
  }
}
\`\`\`

**Output:**
\`\`\`json
{
  "messageId": "<CABz...@mail.gmail.com>",
  "threadId": "18d3f...",
  "emailSendId": "uuid"
}
\`\`\`

**Retriable:**
- ✅ Errores de conexión o temporales
- ❌ Plantilla no encontrada, email inválido

---

### 4. DELAY

Pausa la ejecución del workflow.

**Config:**
\`\`\`typescript
{
  delayMs?: number       // Milisegundos (para delays cortos)
  delayISO?: string      // ISO 8601 duration (ej: "PT1H" = 1 hora)
}
\`\`\`

**Comportamiento:**
- **Delay < 30s**: Espera inline (no cambia status a WAITING)
- **Delay >= 30s**: Marca workflow como WAITING, programa resume_at

**Ejemplos:**
\`\`\`json
// Pausa de 5 segundos
{ "delayMs": 5000 }

// Pausa de 1 hora
{ "delayISO": "PT1H" }

// Pausa de 1 día
{ "delayISO": "P1D" }

// Pausa de 1 hora 30 minutos
{ "delayISO": "PT1H30M" }
\`\`\`

**Output:**
\`\`\`json
{
  "delayMs": 3600000,
  "scheduled": true  // o "waited": true si inline
}
\`\`\`

**Formato ISO 8601 Duration:**
- `P` = Period
- `T` = Time separator
- `H` = Hours
- `M` = Minutes
- `S` = Seconds
- `D` = Days

---

### 5. CONDITIONAL

Bifurca la ejecución según una condición.

**Config:**
\`\`\`typescript
{
  conditionExpression: string    // Expresión booleana
  next_step_if_true: string      // Step key si true
  next_step_if_false: string     // Step key si false
}
\`\`\`

**Operadores soportados:**
- Comparación: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Lógicos: `&&`, `||`, `!`
- Paréntesis para agrupación

**Ejemplos:**
\`\`\`json
// Simple
{
  "conditionExpression": "{{trigger.amount}} > 1000",
  "next_step_if_true": "send_high_value_alert",
  "next_step_if_false": "send_standard_email"
}

// Compleja
{
  "conditionExpression": "({{trigger.amount}} > 5000 && {{trigger.status}} == 'paid') || {{trigger.priority}} == 'urgent'",
  "next_step_if_true": "escalate",
  "next_step_if_false": "continue_normal"
}
\`\`\`

**Output:**
\`\`\`json
{
  "conditionResult": true,
  "nextStep": "send_high_value_alert",
  "expression": "{{trigger.amount}} > 1000"
}
\`\`\`

**Nota:** Este paso sobrescribe el `next_step_on_success` del paso en la configuración del workflow.

---

### 6. SET_VARIABLE

Define o actualiza variables en el contexto.

**Config:**
\`\`\`typescript
{
  variableName: string                    // Nombre de la variable
  valueTemplate: string | Record<string, any>  // Valor, soporta templates
}
\`\`\`

**Ejemplos:**
\`\`\`json
// Variable simple
{
  "variableName": "userId",
  "valueTemplate": "{{trigger.userId}}"
}

// Variable calculada
{
  "variableName": "investmentId",
  "valueTemplate": "{{steps.create_investment.data.id}}"
}

// Variable objeto
{
  "variableName": "userInfo",
  "valueTemplate": {
    "id": "{{trigger.userId}}",
    "email": "{{trigger.email}}",
    "tier": "{{steps.check_tier.data.tier}}"
  }
}
\`\`\`

**Output:**
\`\`\`json
{
  "variableName": "userId",
  "value": "123"
}
\`\`\`

**Uso posterior:**
\`\`\`
{{variables.userId}}
{{variables.userInfo.email}}
\`\`\`

---

### 7. LOG

Registra mensajes para debugging y auditoría.

**Config:**
\`\`\`typescript
{
  message: string                 // Mensaje, soporta templates
  level?: "info" | "warn" | "error" | "debug"  // Default: "info"
}
\`\`\`

**Ejemplos:**
\`\`\`json
{
  "message": "Usuario {{trigger.email}} registrado exitosamente",
  "level": "info"
}

{
  "message": "Inversión {{variables.investmentId}} creada con monto €{{trigger.amount}}",
  "level": "info"
}
\`\`\`

**Comportamiento:**
- Escribe en `console.log/warn/error/debug`
- También guarda en `integrations.lemonway_transactions_log` para persistencia

**Output:**
\`\`\`json
{
  "message": "Usuario user@example.com registrado exitosamente",
  "level": "info"
}
\`\`\`

**Retriable:** NO (nunca falla el workflow)

---

## 📝 TEMPLATE ENGINE

### Archivo: `lib/workflow-engine/template-engine.ts`

### Sustitución de Variables

Sintaxis: `{{path.to.value}}`

**Rutas soportadas:**

| Ruta | Descripción | Ejemplo |
|------|-------------|---------|
| `{{trigger.*}}` | Payload original del evento | `{{trigger.email}}` |
| `{{steps.*}}` | Output de pasos ejecutados | `{{steps.create_inv.data.id}}` |
| `{{variables.*}}` | Variables definidas con SET_VARIABLE | `{{variables.userId}}` |
| `{{context.*}}` | Acceso directo al contexto | `{{context.user.name}}` |
| `{{_meta.*}}` | Metadata de la ejecución | `{{_meta.workflow_run_id}}` |

**Funciones:**

#### `processStringTemplate(template: string, context: WorkflowContext): string`

Procesa plantillas de texto.

\`\`\`typescript
const result = processStringTemplate(
  "Hola {{trigger.name}}, tu inversión {{variables.investmentId}} fue creada",
  context
)
// "Hola John Doe, tu inversión INV-123 fue creada"
\`\`\`

---

#### `processObjectTemplate(template: unknown, context: WorkflowContext): unknown`

Procesa plantillas en objetos y arrays recursivamente.

\`\`\`typescript
const result = processObjectTemplate({
  userId: "{{trigger.userId}}",
  email: "{{trigger.email}}",
  amount: "{{trigger.amount}}",
  metadata: {
    source: "workflow",
    runId: "{{_meta.workflow_run_id}}"
  }
}, context)
\`\`\`

**Comportamiento especial:**
- Si una cadena es **solo** una variable (`{{var}}`), retorna el valor original (preserva tipo)
- Si tiene texto mezclado, retorna string

\`\`\`typescript
// Preserva tipo
"{{trigger.amount}}" → 1000 (number)

// Convierte a string
"Amount: {{trigger.amount}}" → "Amount: 1000" (string)
\`\`\`

---

#### `evaluateCondition(expression: string, context: WorkflowContext): boolean`

Evalúa expresiones booleanas.

\`\`\`typescript
evaluateCondition("{{trigger.amount}} > 1000", context)
// true or false

evaluateCondition(
  "{{trigger.status}} == 'paid' && {{trigger.amount}} >= 500",
  context
)
\`\`\`

**Operadores:**
- `==`, `!=`: Igualdad
- `>`, `<`, `>=`, `<=`: Comparación
- `&&`, `||`: AND, OR lógicos
- `!`: NOT
- Paréntesis para precedencia

---

#### `parseISODuration(duration: string): number`

Convierte duración ISO 8601 a milisegundos.

\`\`\`typescript
parseISODuration("PT1H")      // 3600000 (1 hora)
parseISODuration("PT30M")     // 1800000 (30 minutos)
parseISODuration("PT1H30M")   // 5400000 (1.5 horas)
parseISODuration("P1D")       // 86400000 (1 día)
parseISODuration("PT5S")      // 5000 (5 segundos)
\`\`\`

---

## 🌐 APIs REST

### Base URL: `/api/workflows`

---

### **GET /api/workflows**

Lista todos los workflows.

**Query Params:**
- `status`: "ACTIVE" | "INACTIVE"
- `search`: Busca por nombre
- `event_name`: Filtra por evento trigger
- `limit`: Número de resultados (default: 50)
- `offset`: Paginación (default: 0)

**Response:**
\`\`\`json
{
  "workflows": [
    {
      "id": "uuid",
      "name": "Welcome Email",
      "description": "...",
      "status": "ACTIVE",
      "version": 1,
      "entry_step_key": "send_email",
      "run_count": 42,
      "triggers": [
        { "id": "uuid", "event_name": "USER_REGISTERED" }
      ],
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
\`\`\`

---

### **POST /api/workflows**

Crea un nuevo workflow.

**Body:**
\`\`\`json
{
  "name": "Welcome Workflow",
  "description": "Send welcome email to new users",
  "entry_step_key": "send_email",
  "triggers": [
    {
      "event_name": "USER_REGISTERED",
      "filter_expression": "{{trigger.email}} != null",
      "description": "Cuando un usuario se registra"
    }
  ],
  "steps": [
    {
      "step_key": "send_email",
      "name": "Send Welcome Email",
      "type": "SEND_EMAIL",
      "config": {
        "templateKey": "welcome",
        "toTemplate": "{{trigger.email}}",
        "variablesTemplate": {
          "userName": "{{trigger.name}}"
        }
      },
      "next_step_on_success": null,
      "max_retries": 3,
      "retry_delay_ms": 1000,
      "position_x": 250,
      "position_y": 100
    }
  ],
  "canvas_data": {}
}
\`\`\`

**Response:** Workflow creado con triggers y steps.

---

### **GET /api/workflows/{id}**

Obtiene un workflow específico con triggers y steps.

**Response:**
\`\`\`json
{
  "id": "uuid",
  "name": "...",
  "triggers": [...],
  "steps": [...]
}
\`\`\`

---

### **PUT /api/workflows/{id}**

Actualiza un workflow existente.

**Body:** Igual que POST (parcial)

---

### **DELETE /api/workflows/{id}**

Elimina un workflow y todas sus ejecuciones.

---

### **POST /api/workflows/{id}/activate**

Activa un workflow.

**Validaciones:**
- Debe tener al menos 1 trigger
- Debe tener al menos 1 step
- `entry_step_key` debe existir en los steps

**Response:**
\`\`\`json
{
  "id": "uuid",
  "status": "ACTIVE"
}
\`\`\`

---

### **POST /api/workflows/{id}/deactivate**

Desactiva un workflow (no recibirá más eventos).

---

### **POST /api/workflows/{id}/clone**

Clona un workflow (copia con nuevo ID, status INACTIVE).

---

### **GET /api/workflows/runs**

Lista todas las ejecuciones (todas los workflows).

**Query Params:**
- `status`: Filtra por estado
- `workflow_id`: Filtra por workflow
- `event_name`: Filtra por evento
- `from_date`: Fecha desde (ISO)
- `to_date`: Fecha hasta (ISO)
- `limit`: Default 50
- `offset`: Default 0

**Response:**
\`\`\`json
{
  "runs": [
    {
      "id": "uuid",
      "workflow_id": "uuid",
      "workflow_name": "Welcome Email",
      "status": "COMPLETED",
      "trigger_event_name": "USER_REGISTERED",
      "started_at": "...",
      "finished_at": "..."
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
\`\`\`

---

### **GET /api/workflows/{id}/runs**

Lista ejecuciones de un workflow específico.

---

### **GET /api/workflows/{id}/runs/{runId}**

Obtiene detalle completo de una ejecución.

**Response:**
\`\`\`json
{
  "id": "uuid",
  "workflow_id": "uuid",
  "status": "COMPLETED",
  "trigger_event_name": "USER_REGISTERED",
  "trigger_payload": {...},
  "context": {...},
  "current_step_key": null,
  "error_message": null,
  "started_at": "...",
  "finished_at": "...",
  "step_runs": [
    {
      "id": "uuid",
      "step_key": "send_email",
      "step_name": "Send Welcome Email",
      "step_type": "SEND_EMAIL",
      "status": "COMPLETED",
      "attempt_number": 1,
      "input_data": {...},
      "output_data": {...},
      "started_at": "...",
      "finished_at": "..."
    }
  ]
}
\`\`\`

---

### **DELETE /api/workflows/{id}/runs/{runId}**

Cancela una ejecución (solo si está PENDING, RUNNING o WAITING).

---

### **POST /api/workflows/emit**

Dispara workflows que escuchan un evento.

**Body:**
\`\`\`json
{
  "eventName": "USER_REGISTERED",
  "payload": {
    "email": "user@example.com",
    "name": "John Doe",
    "userId": "123"
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "triggered": 2,
  "runIds": ["uuid1", "uuid2"]
}
\`\`\`

---

### **GET /api/workflows/events**

Lista eventos conocidos con conteo de workflows activos.

**Response:**
\`\`\`json
{
  "events": [
    {
      "id": "uuid",
      "name": "USER_REGISTERED",
      "description": "...",
      "category": "users",
      "payload_schema": {...},
      "active_workflow_count": 3,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
\`\`\`

---

### **POST /api/workflows/events**

Crea o actualiza un evento.

**Body:**
\`\`\`json
{
  "name": "CUSTOM_EVENT",
  "description": "My custom event",
  "category": "custom",
  "payload_schema": {
    "type": "object",
    "properties": {
      "userId": { "type": "string" },
      "action": { "type": "string" }
    }
  }
}
\`\`\`

---

## 🎨 COMPONENTES UI

### 1. WorkflowList (`components/workflows/workflow-list.tsx`)

Lista workflows con filtros.

**Funcionalidades:**
- ✅ Búsqueda por nombre
- ✅ Filtro por status (ACTIVE/INACTIVE)
- ✅ Filtro por evento trigger
- ✅ Paginación
- ✅ Acciones: Activate, Deactivate, Clone, Delete, Edit
- ✅ Vista de triggers por workflow
- ✅ Contador de ejecuciones

---

### 2. WorkflowEditor (`components/workflows/workflow-editor.tsx`)

Editor visual completo de workflows.

**Funcionalidades:**
- ✅ Gestión de triggers (agregar, editar, eliminar)
- ✅ Gestión de steps (agregar, editar, eliminar, reordenar)
- ✅ Editor JSON de configuración por paso
- ✅ Validación de entry_step_key
- ✅ Guardar/Activate/Deactivate
- ✅ Testing: Emit evento con payload personalizado
- ✅ Vista de ejecuciones recientes

**Tabs:**
- **General**: Nombre, descripción, status
- **Triggers**: Gestión de eventos que disparan el workflow
- **Steps**: Lista de pasos con configuración
- **Testing**: Emitir eventos de prueba
- **Runs**: Historial de ejecuciones

---

### 3. WorkflowRunsList (`components/workflows/workflow-runs-list.tsx`)

Lista ejecuciones con filtros.

**Funcionalidades:**
- ✅ Filtro por status
- ✅ Filtro por fecha (desde/hasta)
- ✅ Búsqueda por workflow
- ✅ Indicadores visuales de estado
- ✅ Duración de ejecución
- ✅ Link a detalle

---

### 4. WorkflowRunDetail (`components/workflows/workflow-run-detail.tsx`)

Vista detallada de una ejecución.

**Funcionalidades:**
- ✅ Timeline visual de pasos ejecutados
- ✅ Estado de cada paso (PENDING, RUNNING, COMPLETED, FAILED, etc.)
- ✅ Input/Output de cada paso
- ✅ Error messages y stack traces
- ✅ Contexto de ejecución completo
- ✅ Trigger payload original
- ✅ Duración por paso
- ✅ Número de intentos (reintentos)
- ✅ Botón de cancelar (si está ejecutando)
- ✅ Refresh manual

**Elementos visuales:**
- Iconos por tipo de paso
- Badges de estado con colores
- Collapsible para ver detalles
- JSON formateado con syntax highlight

---

### 5. WorkflowEventsManager (`components/workflows/workflow-events-manager.tsx`)

Gestión de eventos disponibles.

**Funcionalidades:**
- ✅ Lista de eventos con categorías
- ✅ Crear nuevos eventos
- ✅ Editar descripción y schema
- ✅ Ver workflows asociados por evento
- ✅ Desactivar eventos

---

## 🎯 EVENTOS Y TRIGGERS

### Eventos Predefinidos

| Categoría | Evento | Cuándo se dispara |
|-----------|--------|-------------------|
| **users** | USER_REGISTERED | Usuario completa registro |
| | USER_EMAIL_VERIFIED | Usuario verifica email |
| **kyc** | KYC_SUBMITTED | Usuario envía documentación KYC |
| | KYC_APPROVED | KYC es aprobado |
| | KYC_REJECTED | KYC es rechazado |
| **investments** | INVESTMENT_CREATED | Se crea una inversión |
| | INVESTMENT_PAID | Se confirma pago de inversión |
| | INVESTMENT_CANCELLED | Inversión es cancelada |
| **projects** | PROJECT_CREATED | Se crea un proyecto |
| | PROJECT_UPDATED | Proyecto es actualizado |
| | PROJECT_FUNDED | Proyecto alcanza meta de financiación |
| **lemonway** | WALLET_CREATED | Se crea wallet en Lemonway |
| | WALLET_CREDITED | Se agregan fondos a wallet |
| | WALLET_DEBITED | Se retiran fondos de wallet |
| | TRANSFER_COMPLETED | Transferencia P2P completa |
| **webhooks** | WEBHOOK_RECEIVED | Webhook externo recibido |
| **system** | SCHEDULED_TRIGGER | Disparado por cron job |
| | MANUAL_TRIGGER | Disparado manualmente por admin |

---

### Emisión de Eventos

#### Desde código (TypeScript):

\`\`\`typescript
import { emitEvent } from "@/lib/workflow-engine/engine"

// Simple
await emitEvent("USER_REGISTERED", {
  email: "user@example.com",
  name: "John Doe",
  userId: "uuid"
})

// Con más datos
await emitEvent("INVESTMENT_CREATED", {
  investmentId: "inv-123",
  userId: "user-456",
  projectId: "proj-789",
  amount: 1000,
  currency: "EUR",
  status: "pending"
})
\`\`\`

#### Desde API (HTTP):

\`\`\`bash
curl -X POST https://urbix.es/api/workflows/emit \
  -H "Content-Type: application/json" \
  -d '{
    "eventName": "USER_REGISTERED",
    "payload": {
      "email": "user@example.com",
      "name": "John Doe"
    }
  }'
\`\`\`

---

### Filter Expressions

Permiten ejecutar workflows solo si el payload cumple condiciones.

**Ejemplo:**

\`\`\`javascript
// Solo inversiones > €500
{{trigger.amount}} > 500

// Solo usuarios VIP
{{trigger.userTier}} == "VIP"

// Combinación
{{trigger.amount}} > 1000 && {{trigger.status}} == "paid"
\`\`\`

**Uso en trigger:**
\`\`\`json
{
  "event_name": "INVESTMENT_CREATED",
  "filter_expression": "{{trigger.amount}} >= 1000",
  "description": "Solo inversiones grandes"
}
\`\`\`

---

## 💡 EJEMPLOS DE USO

### Ejemplo 1: Welcome Email Simple

\`\`\`json
{
  "name": "Welcome Email",
  "entry_step_key": "send_email",
  "triggers": [
    {
      "event_name": "USER_REGISTERED"
    }
  ],
  "steps": [
    {
      "step_key": "send_email",
      "name": "Send Welcome Email",
      "type": "SEND_EMAIL",
      "config": {
        "templateKey": "welcome",
        "toTemplate": "{{trigger.email}}",
        "variablesTemplate": {
          "userName": "{{trigger.name}}"
        }
      }
    }
  ]
}
\`\`\`

---

### Ejemplo 2: Investment Processing con Conditional

\`\`\`json
{
  "name": "Process Investment",
  "entry_step_key": "check_amount",
  "triggers": [
    {
      "event_name": "INVESTMENT_PAID"
    }
  ],
  "steps": [
    {
      "step_key": "check_amount",
      "name": "Check Investment Amount",
      "type": "CONDITIONAL",
      "config": {
        "conditionExpression": "{{trigger.amount}} > 5000",
        "next_step_if_true": "high_value_alert",
        "next_step_if_false": "standard_notification"
      }
    },
    {
      "step_key": "high_value_alert",
      "name": "Alert High Value",
      "type": "CALL_WEBHOOK",
      "config": {
        "method": "POST",
        "url": "https://hooks.slack.com/...",
        "bodyTemplate": {
          "text": "⚠️ High value investment: €{{trigger.amount}}"
        }
      },
      "next_step_on_success": "update_wallet"
    },
    {
      "step_key": "standard_notification",
      "name": "Standard Notification",
      "type": "SEND_EMAIL",
      "config": {
        "templateKey": "investment_confirmation",
        "toTemplate": "{{trigger.userEmail}}"
      },
      "next_step_on_success": "update_wallet"
    },
    {
      "step_key": "update_wallet",
      "name": "Update Wallet Balance",
      "type": "CALL_INTERNAL_API",
      "config": {
        "method": "POST",
        "urlPath": "/api/wallets/{{trigger.walletId}}/credit",
        "bodyTemplate": {
          "amount": "{{trigger.amount}}",
          "reference": "{{trigger.investmentId}}"
        }
      }
    }
  ]
}
\`\`\`

---

### Ejemplo 3: KYC Approval con Delay

\`\`\`json
{
  "name": "KYC Approval Process",
  "entry_step_key": "delay_check",
  "triggers": [
    {
      "event_name": "KYC_SUBMITTED"
    }
  ],
  "steps": [
    {
      "step_key": "delay_check",
      "name": "Wait 24h for Manual Review",
      "type": "DELAY",
      "config": {
        "delayISO": "P1D"
      },
      "next_step_on_success": "call_verification_api"
    },
    {
      "step_key": "call_verification_api",
      "name": "Call Verification Service",
      "type": "CALL_WEBHOOK",
      "config": {
        "method": "POST",
        "url": "https://verify-api.com/check",
        "bodyTemplate": {
          "userId": "{{trigger.userId}}",
          "documentId": "{{trigger.documentId}}"
        }
      },
      "next_step_on_success": "save_result",
      "max_retries": 5,
      "retry_delay_ms": 5000
    },
    {
      "step_key": "save_result",
      "name": "Save Verification Result",
      "type": "SET_VARIABLE",
      "config": {
        "variableName": "verificationResult",
        "valueTemplate": "{{steps.call_verification_api.data.status}}"
      },
      "next_step_on_success": "send_notification"
    },
    {
      "step_key": "send_notification",
      "name": "Send Result Email",
      "type": "SEND_EMAIL",
      "config": {
        "templateKey": "kyc_result",
        "toTemplate": "{{trigger.email}}",
        "variablesTemplate": {
          "status": "{{variables.verificationResult}}"
        }
      }
    }
  ]
}
\`\`\`

---

### Ejemplo 4: Error Handling con Retry

\`\`\`json
{
  "name": "Sync to External System",
  "entry_step_key": "sync_data",
  "triggers": [
    {
      "event_name": "DATA_UPDATED"
    }
  ],
  "steps": [
    {
      "step_key": "sync_data",
      "name": "Sync to CRM",
      "type": "CALL_WEBHOOK",
      "config": {
        "method": "POST",
        "url": "https://crm.example.com/api/sync",
        "bodyTemplate": {
          "entity": "{{trigger.entity}}",
          "data": "{{trigger.data}}"
        }
      },
      "next_step_on_success": "log_success",
      "next_step_on_error": "log_failure",
      "max_retries": 5,
      "retry_delay_ms": 2000,
      "retry_backoff_multiplier": 2.0
    },
    {
      "step_key": "log_success",
      "name": "Log Success",
      "type": "LOG",
      "config": {
        "message": "Sync successful for {{trigger.entity}}",
        "level": "info"
      }
    },
    {
      "step_key": "log_failure",
      "name": "Log Failure and Alert",
      "type": "LOG",
      "config": {
        "message": "Sync failed after 5 retries for {{trigger.entity}}",
        "level": "error"
      },
      "next_step_on_success": "alert_admin"
    },
    {
      "step_key": "alert_admin",
      "name": "Alert Admin",
      "type": "SEND_EMAIL",
      "config": {
        "templateKey": "sync_failure_alert",
        "toTemplate": "admin@urbix.es",
        "variablesTemplate": {
          "entity": "{{trigger.entity}}",
          "error": "{{steps.sync_data.error}}"
        }
      }
    }
  ]
}
\`\`\`

---

## 🔧 TROUBLESHOOTING

### Problema: Workflow no se dispara

**Posibles causas:**
1. Workflow está en status INACTIVE
2. Trigger no coincide con event_name
3. Filter expression evalúa a false
4. Evento no se está emitiendo correctamente

**Soluciones:**
\`\`\`sql
-- Verificar status
SELECT id, name, status FROM workflows."Workflow" WHERE name = 'My Workflow';

-- Verificar triggers
SELECT * FROM workflows."WorkflowTrigger" WHERE workflow_id = 'uuid';

-- Ver últimas ejecuciones
SELECT * FROM workflows."WorkflowRun" 
WHERE workflow_id = 'uuid' 
ORDER BY started_at DESC LIMIT 10;
\`\`\`

---

### Problema: Paso siempre falla

**Posibles causas:**
1. Template incorrecto (variable no existe)
2. API retorna status no esperado
3. Timeout muy corto
4. Credenciales inválidas

**Soluciones:**
\`\`\`sql
-- Ver detalles del fallo
SELECT 
  sr.step_key,
  sr.status,
  sr.error_message,
  sr.input_data,
  sr.attempt_number
FROM workflows."WorkflowStepRun" sr
WHERE sr.workflow_run_id = 'run-uuid'
ORDER BY sr.started_at;

-- Ver contexto de la ejecución
SELECT context FROM workflows."WorkflowRun" WHERE id = 'run-uuid';
\`\`\`

**Tips:**
- Revisa que las variables existan en el contexto
- Verifica expectedStatusCodes en la config
- Aumenta timeout si es webhook externo
- Usa paso LOG antes del paso problemático

---

### Problema: Workflows en WAITING no se reanudan

**Causa:** `resumeWaitingWorkflows()` no se está ejecutando.

**Solución:**
Configurar cron job:

\`\`\`typescript
// app/api/cron/resume-workflows/route.ts
import { resumeWaitingWorkflows } from "@/lib/workflow-engine/engine"

export async function GET(request: Request) {
  // Validar cron secret
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  await resumeWaitingWorkflows()
  
  return Response.json({ success: true })
}
\`\`\`

**Configurar en Vercel (vercel.json):**
\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron/resume-workflows",
      "schedule": "*/1 * * * *"
    }
  ]
}
\`\`\`

---

### Problema: Performance lento con muchos workflows

**Optimizaciones:**

1. **Índices** - Ya creados en el schema
2. **Limitar ejecuciones antiguas**:
\`\`\`sql
-- Eliminar runs completados más de 30 días
DELETE FROM workflows."WorkflowRun" 
WHERE status = 'COMPLETED' 
AND finished_at < NOW() - INTERVAL '30 days';
\`\`\`

3. **Particionar tabla** (para volúmenes muy altos):
\`\`\`sql
-- Particionar WorkflowRun por mes
CREATE TABLE workflows."WorkflowRun_2026_01" 
PARTITION OF workflows."WorkflowRun"
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
\`\`\`

---

### Problema: Circular loop (workflow infinito)

**Prevención:**
- No crear ciclos en `next_step_on_success`
- Usar CONDITIONAL para salir del loop
- Limitar máximo de pasos ejecutados

**Detección:**
\`\`\`sql
-- Buscar runs con muchos step_runs
SELECT 
  r.id,
  r.workflow_id,
  r.status,
  COUNT(sr.id) as step_count
FROM workflows."WorkflowRun" r
JOIN workflows."WorkflowStepRun" sr ON sr.workflow_run_id = r.id
GROUP BY r.id, r.workflow_id, r.status
HAVING COUNT(sr.id) > 50
ORDER BY step_count DESC;
\`\`\`

**Solución:**
- Cancelar manualmente: `DELETE /api/workflows/{id}/runs/{runId}`
- Agregar límite en engine.ts (ej: max 100 pasos por run)

---

## 📊 MÉTRICAS Y MONITOREO

### Queries útiles

\`\`\`sql
-- Top workflows por ejecuciones
SELECT 
  w.id,
  w.name,
  COUNT(r.id) as run_count,
  COUNT(CASE WHEN r.status = 'COMPLETED' THEN 1 END) as completed,
  COUNT(CASE WHEN r.status = 'FAILED' THEN 1 END) as failed
FROM workflows."Workflow" w
LEFT JOIN workflows."WorkflowRun" r ON r.workflow_id = w.id
GROUP BY w.id, w.name
ORDER BY run_count DESC
LIMIT 10;

-- Tasa de éxito por workflow
SELECT 
  w.name,
  ROUND(
    100.0 * COUNT(CASE WHEN r.status = 'COMPLETED' THEN 1 END) / COUNT(r.id),
    2
  ) as success_rate
FROM workflows."Workflow" w
JOIN workflows."WorkflowRun" r ON r.workflow_id = w.id
GROUP BY w.id, w.name
HAVING COUNT(r.id) > 10
ORDER BY success_rate DESC;

-- Duración promedio por workflow
SELECT 
  w.name,
  AVG(EXTRACT(EPOCH FROM (r.finished_at - r.started_at))) as avg_duration_seconds
FROM workflows."Workflow" w
JOIN workflows."WorkflowRun" r ON r.workflow_id = w.id
WHERE r.status = 'COMPLETED'
GROUP BY w.id, w.name
ORDER BY avg_duration_seconds DESC;

-- Workflows actualmente ejecutando
SELECT 
  w.name,
  r.id as run_id,
  r.current_step_key,
  r.started_at,
  EXTRACT(EPOCH FROM (NOW() - r.started_at)) as running_seconds
FROM workflows."WorkflowRun" r
JOIN workflows."Workflow" w ON w.id = r.workflow_id
WHERE r.status IN ('RUNNING', 'WAITING')
ORDER BY r.started_at;
\`\`\`

---

## 🚀 ROADMAP Y MEJORAS FUTURAS

### En consideración:

1. **Visual Canvas Editor**
   - Drag & drop de pasos
   - Conexiones visuales entre pasos
   - Zoom y pan

2. **Versioning de Workflows**
   - Mantener versiones anteriores
   - Rollback a versión previa
   - Comparación de versiones

3. **Sub-workflows**
   - Llamar a otros workflows como pasos
   - Reutilización de lógica

4. **Parallel Execution**
   - Ejecutar múltiples pasos en paralelo
   - Paso tipo PARALLEL_GROUP

5. **Human-in-the-loop**
   - Paso tipo APPROVAL
   - Pausa hasta aprobación manual
   - Notificación a usuario específico

6. **Advanced Scheduling**
   - Cron triggers
   - Ejecutar workflows en horarios específicos

7. **Data Transformations**
   - Paso tipo TRANSFORM
   - JSONPath queries
   - Data mapping visual

8. **External Tool Integrations**
   - Conectores pre-construidos (Zapier-style)
   - Slack, Stripe, HubSpot, etc.

9. **Testing Framework**
   - Unit tests para workflows
   - Mocks de APIs
   - Assert outputs

10. **Performance Monitoring**
    - Dashboard de métricas
    - Alertas automáticas
    - Distributed tracing

---

## 📚 RECURSOS ADICIONALES

### Archivos clave del proyecto:

- `lib/workflow-engine/engine.ts` - Motor principal
- `lib/workflow-engine/step-handlers.ts` - Implementación de pasos
- `lib/workflow-engine/template-engine.ts` - Sistema de templates
- `lib/types/workflow.ts` - Definiciones TypeScript
- `scripts/070-create-workflows-schema.sql` - Schema SQL
- `components/workflows/` - Componentes UI
- `app/api/workflows/` - Endpoints REST

### Referencias externas:

- [ISO 8601 Duration](https://en.wikipedia.org/wiki/ISO_8601#Durations)
- [JSONPath](https://goessner.net/articles/JsonPath/)
- [Workflow Patterns](http://www.workflowpatterns.com/)

---

**Fin de la documentación**

---

*Última actualización: 2026-01-08*  
*Versión del módulo: 1.0*  
*Mantenido por: Equipo URBIX Platform*
