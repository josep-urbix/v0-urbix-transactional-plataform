# Sistema de Cuentas Virtuales - Documentación Completa

## Índice

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Modelo de Datos](#modelo-de-datos)
4. [Tipos de Operación Contable](#tipos-de-operación-contable)
5. [Flujos de Trabajo](#flujos-de-trabajo)
6. [APIs REST](#apis-rest)
7. [Integración con Lemonway](#integración-con-lemonway)
8. [Seguridad y Control de Acceso](#seguridad-y-control-de-acceso)
9. [Auditoría](#auditoría)
10. [Controles de Integridad](#controles-de-integridad)

---

## 1. Visión General

El Sistema de Cuentas Virtuales es el núcleo contable de la plataforma URBIX. Gestiona los saldos de inversores, promotores y proyectos, registra todos los movimientos financieros y se integra con el proveedor de pagos Lemonway.

### Características Principales

- **Contabilidad de doble entrada**: Cada movimiento afecta saldos de forma consistente
- **Saldo dual**: Saldo disponible y saldo bloqueado por cuenta
- **Idempotencia**: Prevención de movimientos duplicados
- **Trazabilidad completa**: Cada movimiento está vinculado a su origen
- **Integración Lemonway**: Sincronización bidireccional de wallets y transacciones
- **RBAC granular**: Permisos específicos por operación

---

## 2. Arquitectura del Sistema

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Dashboard UI   │  │  Portal Inversor │  │  APIs Externas  │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼─────────────────────┼─────────────────────┼──────────┘
            │                     │                     │
┌───────────▼─────────────────────▼─────────────────────▼──────────┐
│                         CAPA DE API REST                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  /api/admin/virtual-accounts/*                              │ │
│  │  /api/payment-accounts/*                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬──────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                       CAPA DE SERVICIOS                           │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────┐ │
│  │VirtualAccountsSvc │  │PaymentAccountRepo │  │ WorkflowEngine│ │
│  └─────────┬─────────┘  └─────────┬─────────┘  └───────┬───────┘ │
└────────────┼──────────────────────┼────────────────────┼─────────┘
             │                      │                    │
┌────────────▼──────────────────────▼────────────────────▼─────────┐
│                       CAPA DE DATOS                               │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL (Neon)                              │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │ │
│  │  │virtual_accounts │  │    lemonway     │  │  payments   │  │ │
│  │  │    (schema)     │  │    (schema)     │  │  (schema)   │  │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────┐
│                   PROVEEDORES EXTERNOS                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Lemonway API                             │ │
│  │  • GetWalletDetails    • MoneyIn    • MoneyOut              │ │
│  │  • P2P Transfer        • KYC Status • Webhooks              │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
\`\`\`

### Componentes Clave

| Componente | Ubicación | Responsabilidad |
|------------|-----------|-----------------|
| VirtualAccountsService | `lib/virtual-accounts/service.ts` | Lógica de negocio para movimientos |
| PaymentAccountRepository | `lib/repositories/payment-account-repository.ts` | Acceso a datos de payment accounts |
| APIs de Admin | `app/api/admin/virtual-accounts/*` | Endpoints administrativos |
| APIs Públicas | `app/api/payment-accounts/*` | Endpoints de consulta |

---

## 3. Modelo de Datos

### 3.1 Schema: `virtual_accounts`

#### Tabla: `cuentas_virtuales`

Almacena las cuentas virtuales de todos los actores del sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `tipo` | ENUM | INVERSOR, PROMOTOR, PROYECTO, PLATAFORMA_COMISIONES, PLATAFORMA_FONDOS_TRANSITO |
| `referencia_externa_tipo` | VARCHAR(100) | Tipo de entidad externa (investor, project, etc.) |
| `referencia_externa_id` | VARCHAR(255) | ID de la entidad externa |
| `moneda` | VARCHAR(3) | Moneda (EUR por defecto) |
| `saldo_disponible` | DECIMAL(19,4) | Fondos disponibles para usar |
| `saldo_bloqueado` | DECIMAL(19,4) | Fondos reservados/bloqueados |
| `estado` | ENUM | ACTIVA, BLOQUEADA, CERRADA |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Última actualización |

**Índices:**
- `idx_cuentas_virtuales_tipo` - Búsqueda por tipo de cuenta
- `idx_cuentas_virtuales_estado` - Búsqueda por estado
- `idx_cuentas_virtuales_referencia` - Búsqueda por entidad externa
- `idx_cuentas_virtuales_unique_ref` - Unicidad por tipo+referencia+moneda

#### Tabla: `movimientos_cuenta`

Registro inmutable de todos los movimientos contables.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `cuenta_id` | UUID | FK a cuentas_virtuales |
| `tipo_operacion_id` | UUID | FK a tipos_operacion_contable |
| `fecha` | TIMESTAMP | Fecha del movimiento |
| `importe` | DECIMAL(19,4) | Monto (siempre positivo, el signo lo da el tipo) |
| `moneda` | VARCHAR(3) | Moneda del movimiento |
| `saldo_disponible_resultante` | DECIMAL(19,4) | Saldo disponible tras el movimiento |
| `saldo_bloqueado_resultante` | DECIMAL(19,4) | Saldo bloqueado tras el movimiento |
| `proyecto_id` | UUID | Proyecto relacionado (opcional) |
| `inversion_id` | UUID | Inversión relacionada (opcional) |
| `usuario_externo_id` | UUID | Usuario externo relacionado (opcional) |
| `promotor_id` | UUID | Promotor relacionado (opcional) |
| `origen` | VARCHAR(50) | Origen del movimiento |
| `descripcion` | TEXT | Descripción libre |
| `workflow_run_id` | UUID | ID de ejecución de workflow (trazabilidad) |
| `idempotency_key` | VARCHAR(255) | Clave para prevenir duplicados |
| `created_by_admin_id` | TEXT | ID del admin que creó el movimiento |
| `created_by_type` | VARCHAR(50) | Tipo de creador (ADMIN, SYSTEM, WORKFLOW) |
| `created_at` | TIMESTAMP | Fecha de creación del registro |

**Índices:**
- `idx_movimientos_cuenta_id` - Movimientos por cuenta ordenados por fecha
- `idx_movimientos_tipo_operacion` - Búsqueda por tipo de operación
- `idx_movimientos_fecha` - Búsqueda por fecha
- `idx_movimientos_proyecto` - Movimientos por proyecto
- `idx_movimientos_inversion` - Movimientos por inversión
- `idx_movimientos_idempotency` - Unicidad de idempotency_key

#### Tabla: `tipos_operacion_contable`

Catálogo de tipos de operación disponibles.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `codigo` | VARCHAR(100) | Código único (INGRESO_EXTERNO, etc.) |
| `nombre` | VARCHAR(255) | Nombre descriptivo |
| `descripcion` | TEXT | Descripción detallada |
| `afecta_saldo_disponible` | BOOLEAN | ¿Modifica saldo disponible? |
| `afecta_saldo_bloqueado` | BOOLEAN | ¿Modifica saldo bloqueado? |
| `signo_saldo_disponible` | CHAR(1) | '+', '-', '0' |
| `signo_saldo_bloqueado` | CHAR(1) | '+', '-', '0' |
| `visible_para_inversor` | BOOLEAN | ¿Mostrar en portal de inversor? |
| `requiere_aprobacion` | BOOLEAN | ¿Necesita aprobación de supervisor? |
| `activo` | BOOLEAN | ¿Está activo el tipo? |
| `orden_visual` | INTEGER | Orden de visualización |

### 3.2 Schema: `lemonway`

#### Tabla: `wallets`

Wallets de Lemonway vinculados a cuentas virtuales.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID interno |
| `ext_id` | VARCHAR(255) | ID externo en Lemonway |
| `int_id` | VARCHAR(255) | ID interno de Lemonway |
| `owner_tipo` | VARCHAR(50) | Tipo de propietario |
| `owner_id` | VARCHAR(255) | ID del propietario |
| `cuenta_virtual_id` | UUID | FK a cuentas_virtuales |
| `status` | VARCHAR(50) | Estado del wallet |
| `blocked` | BOOLEAN | ¿Está bloqueado? |
| `blocking_reasons` | JSONB | Razones de bloqueo |
| `kyc_level` | VARCHAR(50) | Nivel de KYC |
| `last_synced_at` | TIMESTAMP | Última sincronización |

#### Tabla: `transactions`

Transacciones de Lemonway.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID interno |
| `id_transaction` | VARCHAR(255) | ID de transacción en Lemonway |
| `tipo_operacion` | VARCHAR(100) | Tipo de operación |
| `direction` | VARCHAR(10) | IN, OUT, INTERNAL |
| `amount` | DECIMAL(19,4) | Monto |
| `currency` | VARCHAR(3) | Moneda |
| `fees` | DECIMAL(19,4) | Comisiones |
| `wallet_debited_ext_id` | VARCHAR(255) | Wallet origen |
| `wallet_credited_ext_id` | VARCHAR(255) | Wallet destino |
| `status_code` | VARCHAR(50) | Código de estado |
| `status_normalizado` | VARCHAR(50) | Estado normalizado |

### 3.3 Schema: `payments`

#### Tabla: `payment_accounts`

Cuentas de pago sincronizadas desde Lemonway.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | SERIAL | ID auto-incremental |
| `account_id` | VARCHAR | ID de cuenta en Lemonway |
| `email` | VARCHAR | Email del titular |
| `firstname` | VARCHAR | Nombre |
| `lastname` | VARCHAR | Apellido |
| `balance` | NUMERIC | Saldo (en euros) |
| `status` | VARCHAR | active, blocked, closed |
| `kyc_status` | VARCHAR | none, pending, validated, refused |
| `raw_data` | JSONB | Datos originales de Lemonway |
| `last_sync_at` | TIMESTAMP | Última sincronización |

---

## 4. Tipos de Operación Contable

### Operaciones Predefinidas

| Código | Nombre | Saldo Disponible | Saldo Bloqueado | Uso |
|--------|--------|------------------|-----------------|-----|
| `INGRESO_EXTERNO` | Ingreso Externo | +Aumenta | Sin cambio | Fondos entrantes (transferencia, tarjeta) |
| `RETIRADA_EXTERNA` | Retirada Externa | -Disminuye | Sin cambio | Fondos salientes a cuenta bancaria |
| `RESERVA_INVERSION` | Reserva para Inversión | -Disminuye | +Aumenta | Bloqueo de fondos para inversión pendiente |
| `EJECUCION_INVERSION_INVERSOR` | Ejecución Inversión (Inversor) | Sin cambio | -Disminuye | Desbloqueo al ejecutar inversión |
| `EJECUCION_INVERSION_PROYECTO` | Ejecución Inversión (Proyecto) | +Aumenta | Sin cambio | Fondos recibidos en proyecto |
| `REEMBOLSO_INVERSION` | Reembolso de Inversión | +Aumenta | Sin cambio | Devolución de inversión cancelada |
| `COBRO_COMISION` | Cobro de Comisión | -Disminuye | Sin cambio | Comisión cobrada por plataforma |
| `AJUSTE_MANUAL` | Ajuste Manual | +/-Variable | Sin cambio | Corrección manual (requiere aprobación) |

### Flujo de Saldos

\`\`\`
INGRESO_EXTERNO (€1000)
├── saldo_disponible: 0 → 1000 (+1000)
└── saldo_bloqueado: 0 → 0 (sin cambio)

RESERVA_INVERSION (€500)
├── saldo_disponible: 1000 → 500 (-500)
└── saldo_bloqueado: 0 → 500 (+500)

EJECUCION_INVERSION_INVERSOR (€500)
├── saldo_disponible: 500 → 500 (sin cambio)
└── saldo_bloqueado: 500 → 0 (-500)

Estado Final:
├── saldo_disponible: 500
└── saldo_bloqueado: 0
\`\`\`

---

## 5. Flujos de Trabajo

### 5.1 Crear Movimiento (Transaccional)

\`\`\`typescript
// POST /api/admin/virtual-accounts/accounts/[accountId]/movements

async function createMovement(accountId, body) {
  // 1. Validar autenticación
  const session = await getSession()
  if (!session?.userId) throw new Error("No autorizado")
  
  // 2. Validar campos requeridos
  const { operation_type_code, amount } = body
  if (!operation_type_code || !amount) throw new Error("Faltan campos")
  
  // 3. Obtener tipo de operación activo
  const [opType] = await sql`
    SELECT * FROM virtual_accounts.tipos_operacion_contable
    WHERE codigo = ${operation_type_code} AND activo = true
  `
  if (!opType) throw new Error("Tipo de operación no válido")
  
  // 4. Verificar idempotencia (si existe idempotency_key)
  if (body.idempotency_key) {
    const [existing] = await sql`
      SELECT * FROM virtual_accounts.movimientos_cuenta
      WHERE idempotency_key = ${body.idempotency_key}
    `
    if (existing) return existing // Retornar movimiento existente
  }
  
  // 5. Obtener saldo actual con lock exclusivo
  const [cuenta] = await sql`
    SELECT * FROM virtual_accounts.cuentas_virtuales
    WHERE id = ${accountId}
    FOR UPDATE
  `
  if (!cuenta) throw new Error("Cuenta no encontrada")
  
  // 6. Calcular nuevos saldos según tipo de operación
  let nuevoSaldoDisponible = cuenta.saldo_disponible
  let nuevoSaldoBloqueado = cuenta.saldo_bloqueado
  
  if (opType.afecta_saldo_disponible) {
    if (opType.signo_saldo_disponible === '+') {
      nuevoSaldoDisponible += amount
    } else if (opType.signo_saldo_disponible === '-') {
      nuevoSaldoDisponible -= amount
    }
  }
  
  if (opType.afecta_saldo_bloqueado) {
    if (opType.signo_saldo_bloqueado === '+') {
      nuevoSaldoBloqueado += amount
    } else if (opType.signo_saldo_bloqueado === '-') {
      nuevoSaldoBloqueado -= amount
    }
  }
  
  // 7. Validar que no haya saldos negativos
  if (nuevoSaldoDisponible < 0 && !opType.codigo.includes('AJUSTE')) {
    throw new Error("Saldo insuficiente")
  }
  
  // 8. Insertar movimiento
  const [movimiento] = await sql`
    INSERT INTO virtual_accounts.movimientos_cuenta (...)
    VALUES (...)
    RETURNING *
  `
  
  // 9. Actualizar saldo de la cuenta
  await sql`
    UPDATE virtual_accounts.cuentas_virtuales
    SET saldo_disponible = ${nuevoSaldoDisponible},
        saldo_bloqueado = ${nuevoSaldoBloqueado}
    WHERE id = ${accountId}
  `
  
  // 10. Registrar en auditoría
  await sql`
    INSERT INTO "LemonwayTransaction" (operation, data, status)
    VALUES ('VIRTUAL_ACCOUNT_MOVEMENT', ${JSON.stringify(...)}, 'completed')
  `
  
  return movimiento
}
\`\`\`

### 5.2 Flujo de Inversión Completo

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    INVERSOR REALIZA INVERSIÓN                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. RESERVA_INVERSION en cuenta del inversor                     │
│    • saldo_disponible: -€1000                                   │
│    • saldo_bloqueado: +€1000                                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. COBRO_COMISION en cuenta del inversor (si aplica)            │
│    • saldo_disponible: -€20 (2% comisión)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Validación del proyecto / Período de enfriamiento            │
│    (Fondos permanecen bloqueados)                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│ INVERSIÓN EJECUTADA       │   │ INVERSIÓN CANCELADA       │
└───────────────────────────┘   └───────────────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│ 4a. EJECUCION_INVERSION   │   │ 4b. REEMBOLSO_INVERSION   │
│     _INVERSOR             │   │     • saldo_disponible:   │
│     • saldo_bloqueado:    │   │       +€1000              │
│       -€1000              │   │     • saldo_bloqueado:    │
└───────────────────────────┘   │       -€1000              │
            │                   └───────────────────────────┘
            ▼
┌───────────────────────────┐
│ 5. EJECUCION_INVERSION    │
│    _PROYECTO              │
│    • saldo_disponible:    │
│      +€1000 (en proyecto) │
└───────────────────────────┘
\`\`\`

### 5.3 Sincronización con Lemonway

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    POST /api/payment-accounts/sync               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. Llamar Lemonway API: GetWalletDetails                        │
│    • Obtener todas las cuentas del merchant                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Transformar datos:                                           │
│    • balance: centavos → euros (÷100)                           │
│    • status: código → "active"/"blocked"/"closed"               │
│    • birthDate: DD/MM/YYYY → YYYY-MM-DD                         │
│    • kycStatus: código → "none"/"pending"/"validated"/"refused" │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. UPSERT en payments.payment_accounts                          │
│    • ON CONFLICT (account_id) DO UPDATE...                      │
│    • Guardar raw_data completo                                  │
│    • Actualizar last_sync_at                                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Registrar en LemonwayApiCallLog                              │
│    • request_payload, response_payload                          │
│    • duration_ms, success                                       │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

---

## 6. APIs REST

### 6.1 Cuentas Virtuales

#### GET `/api/admin/virtual-accounts/accounts`

Lista todas las cuentas virtuales con filtros.

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `tipo` | string | Filtrar por tipo (INVERSOR, PROMOTOR, etc.) |
| `estado` | string | Filtrar por estado (ACTIVA, BLOQUEADA, CERRADA) |
| `search` | string | Búsqueda por ID o referencia externa |

**Response:**
\`\`\`json
{
  "accounts": [
    {
      "id": "uuid",
      "tipo": "INVERSOR",
      "referencia_externa_tipo": "investor",
      "referencia_externa_id": "inv-123",
      "moneda": "EUR",
      "saldo_disponible": "1500.0000",
      "saldo_bloqueado": "500.0000",
      "estado": "ACTIVA",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
\`\`\`

#### GET `/api/admin/virtual-accounts/accounts/[accountId]`

Obtiene detalle de una cuenta específica.

**Response:**
\`\`\`json
{
  "id": "uuid",
  "tipo": "INVERSOR",
  "saldo_disponible": "1500.0000",
  "saldo_bloqueado": "500.0000",
  "estado": "ACTIVA",
  "owner_data": {
    "id": "inv-123",
    "email": "investor@example.com",
    "name": "John Doe"
  }
}
\`\`\`

#### GET `/api/admin/virtual-accounts/accounts/[accountId]/movements`

Lista movimientos de una cuenta.

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `limit` | number | Máximo de resultados (default: 50) |
| `offset` | number | Paginación |
| `movement_type` | string | Filtrar por tipo de movimiento |

**Response:**
\`\`\`json
{
  "movements": [
    {
      "id": "uuid",
      "account_id": "uuid",
      "operation_type_code": "INGRESO_EXTERNO",
      "operation_type_name": "Ingreso Externo",
      "amount": "1000.0000",
      "balance_after": "1500.0000",
      "executed_at": "2025-01-08T10:00:00Z",
      "description": "Transferencia bancaria"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
\`\`\`

#### POST `/api/admin/virtual-accounts/accounts/[accountId]/movements`

Crea un nuevo movimiento.

**Request Body:**
\`\`\`json
{
  "operation_type_code": "INGRESO_EXTERNO",
  "amount": 1000.00,
  "reference": "TRF-2025-001",
  "description": "Transferencia bancaria recibida",
  "lemonway_transaction_id": "LW-123456"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "movement": {
    "id": "uuid",
    "amount": 1000.00,
    "balance_after": 2500.00
  }
}
\`\`\`

### 6.2 Tipos de Operación

#### GET `/api/admin/virtual-accounts/operation-types`

Lista todos los tipos de operación activos.

**Response:**
\`\`\`json
[
  {
    "id": "uuid",
    "code": "INGRESO_EXTERNO",
    "name": "Ingreso Externo",
    "description": "Fondos entrantes desde fuente externa",
    "direction": "+",
    "active": true,
    "afecta_saldo_disponible": true,
    "afecta_saldo_bloqueado": false,
    "visible_para_inversor": true,
    "requiere_aprobacion": false
  }
]
\`\`\`

#### POST `/api/admin/virtual-accounts/operation-types`

Crea un nuevo tipo de operación.

**Request Body:**
\`\`\`json
{
  "code": "DIVIDENDO",
  "name": "Pago de Dividendo",
  "direction": "+",
  "description": "Pago de dividendos a inversores"
}
\`\`\`

### 6.3 Payment Accounts (Lemonway)

#### GET `/api/payment-accounts`

Lista cuentas de pago sincronizadas con estadísticas.

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `accountId` | string | Filtrar por ID de cuenta |
| `email` | string | Filtrar por email |
| `status` | string | active, blocked, closed |
| `kycStatus` | string | none, pending, validated, refused |
| `limit` | number | Máximo de resultados |
| `offset` | number | Paginación |

**Response:**
\`\`\`json
{
  "accounts": [...],
  "stats": {
    "totalAccounts": 1250,
    "activeAccounts": 1200,
    "blockedAccounts": 50,
    "totalBalance": 1500000.00,
    "averageBalance": 1200.00,
    "byKycStatus": {
      "none": 100,
      "pending": 50,
      "validated": 1000,
      "refused": 100
    },
    "byAccountType": {
      "personaFisica": 1000,
      "personaJuridica": 250
    }
  }
}
\`\`\`

#### POST `/api/payment-accounts/sync`

Sincroniza todas las cuentas desde Lemonway.

**Request Body:**
\`\`\`json
{
  "force": true  // Opcional: forzar re-sincronización completa
}
\`\`\`

---

## 7. Integración con Lemonway

### 7.1 Mapeo de Campos

| Campo Lemonway | Campo BD | Transformación |
|----------------|----------|----------------|
| `balance` | `balance` | ÷100 (centavos a euros) |
| `status: 6` | `status` | → "active" |
| `isblocked: true` | `status` | → "blocked" |
| `birth.date` | `birth_date` | DD/MM/YYYY → YYYY-MM-DD |
| `kycStatus: 0` | `kyc_status` | → "none" |
| `kycStatus: 1` | `kyc_status` | → "pending" |
| `kycStatus: 2` | `kyc_status` | → "validated" |
| `kycStatus: 3` | `kyc_status` | → "refused" |

### 7.2 Webhooks

Los webhooks de Lemonway se procesan en `/api/admin/lemonway/webhooks`:

- **Wallet Status Change**: Actualiza estado del wallet y registra historial
- **Transaction Notification**: Crea movimiento en cuenta virtual correspondiente
- **KYC Update**: Actualiza nivel de KYC del wallet
- **Document Status**: Actualiza estado de documentos

### 7.3 Sistema de Reintentos

\`\`\`
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE REINTENTOS                         │
├─────────────────────────────────────────────────────────────────┤
│ retry_status: none      → Éxito en primer intento               │
│ retry_status: pending   → Pendiente de reintento                │
│ retry_status: success   → Reintento exitoso                     │
│ retry_status: failed    → Fallo definitivo                      │
├─────────────────────────────────────────────────────────────────┤
│ Estrategia: Exponential backoff                                 │
│ • Intento 1: Inmediato                                          │
│ • Intento 2: +30 segundos                                       │
│ • Intento 3: +2 minutos                                         │
│ • Intento 4: +10 minutos                                        │
│ • Intento 5: +1 hora (máximo)                                   │
├─────────────────────────────────────────────────────────────────┤
│ Máximo reintentos: 5                                            │
│ Si falla: manual_retry_needed = true                            │
└─────────────────────────────────────────────────────────────────┘
\`\`\`

---

## 8. Seguridad y Control de Acceso

### 8.1 Autenticación

Todas las APIs requieren autenticación via sesión HTTP-only cookie:

\`\`\`typescript
const session = await getSession()
if (!session?.userId) {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 })
}
\`\`\`

### 8.2 Permisos RBAC

| Permiso | Descripción | APIs Protegidas |
|---------|-------------|-----------------|
| `VIEW_ACCOUNTS` | Ver lista de cuentas | GET /accounts |
| `VIEW_ACCOUNT_DETAIL` | Ver detalle de cuenta | GET /accounts/[id] |
| `VIEW_MOVEMENTS` | Ver movimientos | GET /accounts/[id]/movements |
| `MANAGE_OPERATION_TYPES` | Gestionar tipos | POST/PUT/DELETE /operation-types |
| `CREATE_MANUAL_ADJUSTMENT` | Crear ajustes | POST /movements (AJUSTE_MANUAL) |
| `APPROVE_MANUAL_ADJUSTMENT` | Aprobar ajustes | POST /movements/[id]/approve |
| `VIEW_LEMONWAY_DATA` | Ver datos Lemonway | GET /payment-accounts |
| `LINK_WALLET` | Vincular wallet | POST /link-wallet |

### 8.3 Verificación de Permisos

\`\`\`typescript
import { getSession, requireAdmin } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getSession()
  
  // Verifica rol admin Y registra el intento de acceso
  const authResult = await requireAdmin(
    session?.user,
    'virtual_accounts',  // recurso
    'view',              // acción
    request
  )
  
  if (!authResult.success) {
    return authResult.error // 401 o 403 con logging
  }
  
  // Lógica de la API...
}
\`\`\`

### 8.4 Roles del Sistema

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `superadmin` | Acceso completo | Todos los permisos |
| `admin` | Administrador | Según permisos asignados |
| `user` | Usuario estándar | Solo lectura básica |

---

## 9. Auditoría

### 9.1 Tabla AccessLog

Registra todos los intentos de acceso (permitidos y denegados):

\`\`\`sql
CREATE TABLE "AccessLog" (
  id UUID PRIMARY KEY,
  "userId" TEXT,
  "userEmail" TEXT,
  "userRole" TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  "deniedReason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "requestPath" TEXT,
  "requestMethod" TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
\`\`\`

### 9.2 Tabla LemonwayTransaction

Registra todas las operaciones relacionadas con movimientos:

\`\`\`sql
INSERT INTO "LemonwayTransaction" (
  operation,        -- 'VIRTUAL_ACCOUNT_MOVEMENT'
  data,            -- JSON con detalles del movimiento
  timestamp,       -- Momento de la operación
  response,        -- Resultado de la operación
  status           -- 'completed', 'failed', 'pending'
);
\`\`\`

### 9.3 Consulta de Logs

\`\`\`
GET /dashboard/access-logs
GET /api/admin/access-logs?resource=virtual_accounts&allowed=false
\`\`\`

---

## 10. Controles de Integridad

### 10.1 Validaciones de Base de Datos

\`\`\`sql
-- CHECK constraints
CHECK (importe > 0)  -- Importes siempre positivos
CHECK (signo_saldo_disponible IN ('+', '-', '0'))
CHECK (signo_saldo_bloqueado IN ('+', '-', '0'))
CHECK (direction IN ('IN', 'OUT', 'INTERNAL'))

-- UNIQUE constraints
UNIQUE (tipo, referencia_externa_tipo, referencia_externa_id, moneda)
UNIQUE (idempotency_key) WHERE idempotency_key IS NOT NULL
UNIQUE (ext_id)  -- ID externo de Lemonway
\`\`\`

### 10.2 Validaciones de Negocio

| Validación | Descripción | Implementación |
|------------|-------------|----------------|
| Saldo suficiente | No permitir saldo negativo | Check antes de movimiento |
| Idempotencia | No duplicar movimientos | Unique index + check |
| Tipo activo | Solo usar tipos de operación activos | WHERE activo = true |
| Cuenta activa | Solo operar en cuentas activas | WHERE status = 'active' |
| Aprobación | Ajustes manuales requieren aprobación | requiere_aprobacion flag |

### 10.3 Transaccionalidad

Todas las operaciones críticas usan transacciones ACID:

\`\`\`sql
-- Lock exclusivo para evitar race conditions
SELECT * FROM virtual_accounts.cuentas_virtuales
WHERE id = $1
FOR UPDATE;

-- Operaciones atómicas
BEGIN;
  INSERT INTO movimientos_cuenta (...);
  UPDATE cuentas_virtuales SET saldo_disponible = ...;
COMMIT;
\`\`\`

### 10.4 Idempotencia

\`\`\`typescript
// Verificar si ya existe movimiento con misma idempotency_key
if (body.idempotency_key) {
  const [existing] = await sql`
    SELECT * FROM virtual_accounts.movimientos_cuenta
    WHERE idempotency_key = ${body.idempotency_key}
  `
  if (existing) {
    // Retornar movimiento existente en lugar de crear duplicado
    return existing
  }
}
\`\`\`

---

## Archivos de Referencia

| Archivo | Descripción |
|---------|-------------|
| `scripts/101-create-virtual-accounts-schema.sql` | Schema completo de BD |
| `lib/virtual-accounts/service.ts` | Lógica de negocio |
| `lib/repositories/payment-account-repository.ts` | Repositorio de datos |
| `lib/types/payment-account.ts` | Tipos TypeScript |
| `app/api/admin/virtual-accounts/*` | APIs administrativas |
| `app/api/payment-accounts/*` | APIs públicas |
| `docs/RBAC-CUENTAS-VIRTUALES.md` | Documentación RBAC |
| `docs/LEMONWAY-FIELD-MAPPING.md` | Mapeo de campos Lemonway |
| `docs/AUTH-SYSTEM.md` | Sistema de autenticación |

---

## Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2025-01-08 | Documentación inicial completa |
