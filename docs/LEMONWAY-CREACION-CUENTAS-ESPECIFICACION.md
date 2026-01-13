# Especificación: Creación de Cuentas en Lemonway

## PRINCIPIOS OBLIGATORIOS DE IMPLEMENTACIÓN

⚠️ **CRÍTICO**: Estos principios son no-negociables y deben respetarse en toda la implementación:

### 1. NO INVENTAR NADA QUE NO ESTÉ ESPECIFICADO
- **Regla**: Solo implementar exactamente lo detallado en este documento
- **Restricción**: No agregar features "por si acaso" o anticipadas
- **Validación**: Cada línea de código debe poder ser trazada a una sección específica de este documento
- **Ej. PROHIBIDO**: Agregar campos adicionales a `lemonway_account_requests` que no estén aquí detallados
- **Ej. PERMITIDO**: Implementar validación de email exactamente como especifica sección 9.2

### 2. NO HACER CAMBIOS EN OTROS MÓDULOS O FEATURES
- **Regla**: Esta feature es self-contained, no debe modificar sistemas existentes
- **Restricción**: 
  - ✗ NO modificar `payment_accounts` más allá de relación con `lemonway_account_requests`
  - ✗ NO cambiar RBAC, solo USAR permisos existentes
  - ✗ NO modificar `lemonway_request_queue`, solo USAR para encolamiento
  - ✗ NO cambiar schemas de `virtual_accounts`, solo USAR para vincular
  - ✗ NO tocar workflow engine, solo DISPARAR eventos existentes
- **Verificación**: Si necesitas modificar otro módulo, DETENTE y pregunta al usuario primero

### 3. EN CASO DE DUDA, PREGUNTAR AL USUARIO - NO ASUMIR NADA
- **Regla**: Cualquier ambigüedad, interpretación o detalle no explícito → PREGUNTAR
- **Contexto**: Si la especificación NO dice exactamente cómo hacer algo, NO asumir
- **Ejemplos de DUDAS válidas**:
  - ¿Soft delete o hard delete para solicitudes canceladas?
  - ¿Qué email notifica si falla creación en Lemonway?
  - ¿Cuántos reintentos automáticos máximo? (si no está especificado)
  - ¿Usar UpdateTag o revalidateTag para caché?
- **Ejemplos de NO DUDAS** (porque está especificado):
  - Estados de solicitud ✓ (DRAFT, SUBMITTED, PENDING_KYC, etc)
  - Tabla `investors.lemonway_account_requests` ✓ (Sección 8)
  - RBAC con `lemonway:accounts:create` ✓ (Sección 2.6)
  - Validaciones de Lemonway ✓ (Sección 9)

---

## REQUISITOS FUNCIONALES Y NO-FUNCIONALES

### REQUISITOS FUNCIONALES (QUÉ HACER)

| ID | Requisito | Fase | Especificación |
|----|-----------|----|------------------|
| RF-1 | Crear cuenta en Lemonway con datos mínimos | 1 | Sección 2 + Sección 4 |
| RF-2 | Completar verificación KYC/AML | 2 | Sección 2 + Sección 4 |
| RF-3 | Validar duplicados antes de crear | 1 | Sección 2.3 |
| RF-4 | **AUTO-GUARDAR datos mientras usuario escribe** | 1 + 2 | Sección 2.1.1 |
| RF-5 | Recuperar último DRAFT si usuario regresa | 1 + 2 | Sección 2.1.2 |
| RF-6 | Crear solicitud con ID único (UUID + referencia legible) | 1 | Sección 8.1 |
| RF-7 | CRUD completo de solicitudes (Create, Read, Update, Delete, Recover) | - | Sección 8.2 |
| RF-8 | Integrar con cola de transacciones (URGENT/NORMAL) | 1 + 2 | Sección 4.2 |
| RF-9 | Validar reglas de Lemonway (caracteres, longitud, edad) | 1 + 2 | Sección 9 |
| RF-10 | Manejar validaciones fallidas con status INVALID | 1 + 2 | Sección 8.5 |
| RF-11 | Estados: KYC-1 Completo (Fase 1), KYC-2 Completo (Fase 2) | 1 + 2 | Sección 8.1 |

### REQUISITOS NO-FUNCIONALES (CÓMO HACERLO)

| ID | Requisito | Especificación |
|----|-----------|------------------|
| RNF-1 | **Auto-guardado NO bloqueante**: No esperar respuesta de guardado para continuar escribiendo | Sección 2.1.1 |
| RNF-2 | **Debouncing**: Esperar 1-2 segundos sin cambios antes de guardar | Sección 2.1.1 |
| RNF-3 | **Validación asincrónica**: Validar mientras se auto-guarda, pero NO impedir guardado si hay errores | Sección 2.1.1 |
| RNF-4 | **Feedback visual**: Indicadores de "Guardando..." y "✓ Guardado" | Sección 2.1.1 |
| RNF-5 | **Recuperación automática**: Al volver al formulario, cargar último DRAFT | Sección 2.1.2 |
| RNF-6 | **Endpoint específico**: POST `/api/admin/lemonway/accounts/request/auto-save` | Sección 2.1.1 |
| RNF-7 | **Persistencia**: Guardar en `lemonway_account_requests` con estado `DRAFT` | Sección 2.1.1 |
| RNF-8 | **Manejo de errores**: Si auto-guardado falla, reintentar automático | Sección 2.1.4 |
| RNF-9 | **Auditoría**: Registrar auto-guardados en `AccessLog` | Sección 2.6 |
| RNF-10 | **Rate limiting**: Máximo 1 auto-guardado por campo por segundo | Sección 2.1.1 |

---

## 0. REQUISITOS PREVIOS

Antes de implementar las Fases 1 y 2, se debe crear la siguiente tabla de soporte:

### Tabla: `investors.countries` (ISO 3166-1)
**Propósito**: Centralizar y eliminar hardcoding de códigos de país en formato ISO 3166-1 alpha-2 que Lemonway requiere.

**Estructura**:
```sql
- id UUID PRIMARY KEY
- code_iso2 VARCHAR(2) UNIQUE NOT NULL - Código ISO 3166-1 alpha-2 (ej: ES, FR, DE)
- code_iso3 VARCHAR(3) UNIQUE NOT NULL - Código ISO 3166-1 alpha-3 (ej: ESP, FRA, DEU)
- name_en VARCHAR - Nombre país en inglés
- name_es VARCHAR - Nombre país en español
- region VARCHAR - Región geográfica (Europe, Asia, Americas, Africa, Oceania)
- is_eu_member BOOLEAN - Es miembro UE
- is_restricted BOOLEAN - Restricciones regulatorias (Cuba, Irán, etc)
- default_currency VARCHAR(3) - Moneda por defecto (EUR, USD, etc)
- is_active BOOLEAN - País activo para nuevas cuentas
- created_at TIMESTAMP DEFAULT NOW()
- updated_at TIMESTAMP DEFAULT NOW()
```

**Script de creación**: `scripts/094-create-countries-iso-table.sql`

**Beneficios**:
- ✅ No hardcodear códigos de país en formularios
- ✅ Soporte para restricciones regulatorias dinámicas
- ✅ Validación automática de país en forms URBIX
- ✅ Relación con Lemonway sin conversiones
- ✅ Auditable y mantenible

**Uso en Fase 1**:
```typescript
// En endpoint POST /api/admin/lemonway/accounts/create-account
const country = await sql`
  SELECT code_iso2 FROM investors.countries 
  WHERE id = $1 AND is_active = true
`
// Usar code_iso2 directamente en payload de Lemonway
```

## 1. VISIÓN GENERAL

Esta feature permite crear nuevas cuentas/wallets en Lemonway directamente desde URBIX usando el Online Onboarding API de Lemonway, automatizando completamente el proceso de incorporación de inversores con validación KYC/AML integrada.

## 2. REQUERIMIENTOS CONFIRMADOS

### 2.1 Flujo de Onboarding
- **Automático y seamless**: Crear cuenta + iniciar onboarding en una sola operación
- **Sin redirecciones**: Capturar TODOS los datos en URBIX, luego sincronizar con Lemonway
- **Resumption URLs**: Soporte para inversores que abandonen el proceso (recuperar sesión)
- **Estado de perfil**: Seguimiento de status (AWAITING_INFORMATION, VERIFIED, KYC_VALIDATED, REJECTED)

### 2.1.1 Auto-guardado de Formulario
- **Guardado automático**: Cada vez que el usuario ingresa/modifica datos en el formulario, se guarda automáticamente
- **Sin acción del usuario**: No requiere click en botón "Guardar" o "Guardar borrador"
- **Persistencia**: Los datos se guardan en `lemonway_account_requests` con estado `DRAFT`
- **Debouncing**: Esperar ~1-2 segundos después de última escritura antes de guardar (evitar guardar cada keystroke)
- **Validación local**: Validar formato mientras se escribe, pero NO impedir guardado si hay errores
- **Feedback visual**: Mostrar indicador de "Guardando..." y "Guardado" sucintamente
- **Recovery**: Si cierra navegador/sesión expira, al volver recupera el último draft guardado automáticamente
- **Endpoint**: POST `/api/admin/lemonway/accounts/request/auto-save` - Guarda cambios parciales en estado DRAFT

### 2.1.2 Flujo Completo con Auto-guardado

```
1. Admin navega a /dashboard/admin/lemonway/create-account
   ├─ Sistema detecta solicitud DRAFT anterior (si existe)
   └─ Carga datos previos automáticamente
   
2. Admin escribe en campo "Nombre"
   ├─ Input evento change detectado
   ├─ Espera 1.5 segundos (debounce)
   ├─ POST /api/admin/lemonway/accounts/request/auto-save
   │  └─ Guarda en BD con estado DRAFT
   ├─ Muestra "⏳ Guardando..." (0.5 segundos)
   └─ Muestra "✓ Guardado" (desaparece en 2 segundos)

3. Admin continúa rellenando otros campos
   ├─ Cada campo se auto-guarda (igual flujo)
   └─ Si abandona navegador, datos persisten

4. Cuando esté listo, click "Crear Cuenta" o "Enviar Validación"
   ├─ Sistema valida completamente
   └─ Si OK: Envía a Lemonway, cambia estado a SUBMITTED/PENDING_KYC
   └─ Si error: Muestra errores pero mantiene DRAFT para corrección

5. Si admin regresa a formulario en estado DRAFT
   ├─ Auto-carga último draft guardado
   └─ Puede continuar editando/completando
```

### 2.1.3 Comportamiento del Auto-guardado

| Evento | Acción |
|--------|--------|
| Usuario escribe en campo | Debounce 1.5 segundos |
| Debounce completado | POST auto-save a BD |
| Auto-save exitoso | Mostrar ✓ "Guardado" |
| Auto-save falla (error red) | Mostrar ⚠️ error, reintentar automático |
| Usuario cambia de página sin completar | DRAFT persiste para recuperar luego |
| Usuario abre formulario existente | Cargar último DRAFT automáticamente |
| Usuario crea NUEVA solicitud | Nueva entrada en DRAFT |

### 2.1.4 Excepciones
- **Cambios de sesión**: Si sesión expira mientras se auto-guarda, mostrar toast "Sesión expirada, iniciando sesión..." y reautenticar
- **Conflictos**: Si otro usuario abre mismo DRAFT, último que guarde gana (actualiza `updated_at`)
- **Permisos**: Solo guardar si usuario tiene permiso `lemonway:accounts:create`

### 2.2 Tipos de Cuentas
- **Solo personas físicas (individuos)** en fase inicial
- **Profiles**: Soporte para PROJECT_HOLDER, DONOR, STUDENT, JOB_SEEKER, PAYER
- **Visa applicants**: Posible soporte futuro con campos adicionales
- **Restricciones regionales**: Estados prohibidos (Cuba, Irán, Corea del Norte, Siria, etc.)

### 2.3 Validación y Prevención de Duplicados
- **Uniqueness en Lemonway**: first_name + last_name + birthdate + birthcountry
- **Búsqueda previa**: Validar contra base de datos URBIX Y Lemonway antes de crear
- **Alertas de duplicados**: Mostrar cuentas similares existentes
- **Merge inteligente**: Si existe similar, opción de vincular en lugar de crear

### 2.4 Integración con Workflow
- **Disparador de workflow**: Crear evento "account_creation_lemonway"
- **Acciones posteriores**: Email de confirmación, tarea de verificación, documento de términos
- **Webhook de estado**: Recibir actualizaciones de Lemonway en tiempo real

### 2.5 Captura de Datos
- **Datos en URBIX primero**: Formulario completo antes de enviar a Lemonway
- **Campos obligatorios**: Nombre, apellido, email, teléfono, fecha nacimiento, país nacimiento
- **Campos opcionales**: PEP status, origen de fondos, ocupación, nacionalidad secundaria
- **Validación de formato**: Email, teléfono, DNI/Pasaporte según país

### 2.6 Permisos y Seguridad

Integración completa con sistema RBAC centralizado de URBIX (lib/auth/)

**Sistema RBAC Centralizado** (`lib/auth/`):
- Roles jerárquicos: superadmin (100) > admin (80) > supervisor (60) > gestor (40) > user (20)
- Permisos granulares desde BD con caché de 5 minutos
- Auditoría automática en tabla `AccessLog` (IP, User Agent, timestamp, resultado)
- Normalizamos roles automáticamente (case-insensitive)

**Permisos específicos para creación de cuentas**:
- `lemonway:accounts:create` - Crear nuevas cuentas en Lemonway
- `lemonway:accounts:view` - Ver cuentas existentes
- `lemonway:accounts:edit` - Editar información de cuentas
- `lemonway:accounts:duplicate_check` - Ejecutar validación de duplicados
- `lemonway:queue:create` - Crear items en cola (encolamiento con prioridad)
- `lemonway:queue:manage` - Gestionar cola (reintentos, cancelaciones)

**Protección de endpoints** (usando middleware `lib/auth/middleware.ts`):
- `requireAdmin(user, 'lemonway:accounts', 'create', request)` - Verifica admin + auditoría automática
- `requirePermission(user, 'lemonway:accounts:create', 'lemonway:accounts', 'create', request)` - Permiso granular

**Ejemplos de implementación**:

```typescript
// Endpoint: POST /api/admin/lemonway/accounts/create-account
import { getSession, requirePermission } from '@/lib/auth'

export async function POST(request: Request) {
  const session = await getSession()
  
  // Verifica permiso + registra acceso automáticamente
  const authResult = await requirePermission(
    session?.user,
    'lemonway:accounts:create',
    'lemonway:accounts',
    'create',
    request
  )
  if (!authResult.success) return authResult.error
  
  // Auditoría automática ✅ - Se registró en AccessLog
  // Continuar con lógica de creación...
}
```

**Auditoría automática**:
- ✅ Quién intentó (userId, email, rol)
- ✅ Qué recurso (lemonway:accounts)
- ✅ Qué acción (create)
- ✅ Desde dónde (IP Address)
- ✅ User Agent del cliente
- ✅ Request path y method (GET /api/admin/lemonway/accounts/create-account)
- ✅ Timestamp exacto
- ✅ Razón si fue denegado

**Visualización de auditoría**:
- Dashboard: `/dashboard/access-logs`
- API: `GET /api/admin/access-logs`
- Filtros: Permitido/Denegado, Recurso, Usuario, Rango de fechas

**Rate limiting** (integrado con cola + permisos):
- Máximo 50 cuentas/hora por usuario (configurado en LemonwayRateLimiter)
- Bypass posible para roles superadmin con justificación
- Registrado en AccessLog con metadata de rate limit

**2FA para creaciones masivas**:
- Si un usuario intenta crear > 10 cuentas en 1 minuto
- Requerir confirmación de 2FA
- Si falla: loguear intento fallido en AccessLog

### 2.7 Sincronización Post-creación
- **Automática**: Tras crear en Lemonway, sincronizar a `payment_accounts`
- **Vinculación**: Crear automáticamente `virtual_accounts` para inversores
- **Estado**: Marcar como "PENDING_KYC" hasta que Lemonway valide

## 3. DIVISIÓN EN DOS FASES

### FASE 1: CREACIÓN DE CUENTA (ACCOUNT CREATION)
**Objetivo**: Crear wallet/cuenta en Lemonway con datos básicos sin validación KYC

**Flujo**:
1. ADMIN completa formulario con datos básicos en URBIX
   - Nombre, apellido, email, teléfono, fecha nacimiento, país nacimiento
   - Dirección básica
   - Tipo de perfil (PROJECT_HOLDER, DONOR, etc.)

2. URBIX valida duplicados (3 niveles):
   - Base de datos URBIX (payment_accounts)
   - Base de datos Lemonway (via getAccountsByIds)
   - Búsqueda fuzzy si es similar

3. URBIX crea cuenta en Lemonway via Online Onboarding API
   - POST /accounts/create-onboarding-session
   - Devuelve: wallet_id + resumption_url

4. URBIX sincroniza a BD local:
   - Crea payment_account con status KYC-1 Completo
   - Crea virtual_account (INACTIVE)
   - Vincula con investor.user

5. Dispara workflow "lemonway_account_created"
   - Email al ADMIN confirmando creación
   - Email al usuario con enlace de dashboard

**Status de cuenta**: KYC-1 Completo

**Endpoints necesarios**:
- POST /api/admin/lemonway/accounts/create-account
- GET /api/admin/lemonway/accounts/check-duplicates
- GET /api/admin/lemonway/accounts/{walletId}

---

### FASE 2: VERIFICACIÓN DE IDENTIDAD (KYC/AML VERIFICATION)
**Objetivo**: Completar verificación de identidad en Lemonway (KYC/AML)

**Flujo**:
1. Usuario (o ADMIN) inicia proceso de verificación
   - Acceso a resumption URL guardada en BD
   - O desde dashboard URBIX

2. Usuario completa onboarding en Lemonway:
   - Carga documentos (DNI, pasaporte, comprobante domicilio)
   - Selfie con documento (verificación biométrica)
   - Información adicional (PEP status, origen de fondos, etc.)
   - Aceptación de términos

3. Lemonway valida documentos:
   - OCR automático
   - Verificación contra bases de datos
   - Análisis de riesgo (AML)

4. URBIX recibe webhooks de Lemonway:
   - `KYC_VALIDATED` → Actualizar status a KYC-2 Completo
   - `KYC_REJECTED` → Notificar admin, marcar status REJECTED
   - `ADDITIONAL_INFORMATION_REQUIRED` → Solicitar más datos

5. Dispara workflows según resultado:
   - Si VALIDATED: "lemonway_kyc_approved" (desbloquear transacciones)
   - Si REJECTED: "lemonway_kyc_rejected" (explicar motivos, opción reaplicar)

6. Actualizar estado de cuentas:
   - Payment account: KYC-2 Completo (si KYC approved)
   - Virtual account: ACTIVE (si KYC approved)

**Status de cuenta**: KYC-2 Completo

**Endpoints necesarios**:
- POST /api/admin/lemonway/accounts/initiate-kyc
- POST /api/webhooks/lemonway/kyc-events
- GET /api/admin/lemonway/accounts/{walletId}/kyc-status

---

## 4. CAMBIOS EN BD

### Tabla: `payment_accounts`
**Nuevas columnas**:
```sql
- lemonway_account_status VARCHAR (ACCOUNT_CREATED, PENDING_KYC, KYC-1 Completo, KYC-2 Completo, REJECTED, SUSPENDED)
- kyc_initiated_at TIMESTAMP
- kyc_completed_at TIMESTAMP
- kyc_rejected_reason VARCHAR (si aplica)
- kyc_retry_count INT DEFAULT 0
- lemonway_resumption_url VARCHAR (para reanudar onboarding)
- lemonway_profile_type VARCHAR (PROJECT_HOLDER, DONOR, etc.)
```

### Tabla: `virtual_accounts`
**Nuevas columnas**:
```sql
- kyc_required BOOLEAN DEFAULT true
- kyc_status VARCHAR (PENDING, VERIFIED, REJECTED)
- account_can_transact BOOLEAN DEFAULT false
```

### Nueva tabla: `lemonway_account_creation_logs`
```sql
- id UUID PRIMARY KEY
- created_by_user_id UUID (admin que creó)
- wallet_id VARCHAR (Lemonway)
- account_data JSONB (datos enviados)
- created_at TIMESTAMP
- status VARCHAR (CREATED, SYNC_ERROR, SYNC_SUCCESS)
- error_message VARCHAR (si aplica)
```

### Nueva tabla: `lemonway_kyc_events`
```sql
- id UUID PRIMARY KEY
- wallet_id VARCHAR
- event_type VARCHAR (KYC_VALIDATED, KYC_REJECTED, etc.)
- event_data JSONB (detalles del evento)
- processed_at TIMESTAMP
- processed BOOLEAN
```

### Tabla: `investors.lemonway_account_requests`

**Estructura SQL**:
```sql
CREATE TABLE investors.lemonway_account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_reference VARCHAR(20) UNIQUE NOT NULL, -- REQ-2025-001, REQ-2025-002, etc
  status VARCHAR NOT NULL DEFAULT 'DRAFT',
    -- Estados: DRAFT, SUBMITTED, KYC-1 Completo, KYC-2 Completo, ACTIVE, 
    -- INVALID, REJECTED, CANCELLED
  validation_status VARCHAR DEFAULT 'PENDING',
    -- PENDING, VALID, INVALID - Pre-validación de formato
  validation_errors JSONB, -- Errores de validación (qué campo falló)
  
  -- Datos personales (de Fase 1)
  first_name VARCHAR(35) NOT NULL,
  last_name VARCHAR(35) NOT NULL,
  birth_date DATE NOT NULL,
  email VARCHAR(60) NOT NULL,
  phone_number VARCHAR(20),
  birth_country_id UUID NOT NULL, -- FK a investors.countries
  nationality_ids UUID[] NOT NULL, -- Array de FK a investors.countries
  profile_type VARCHAR NOT NULL, -- PROJECT_HOLDER, DONOR, etc
  
  -- Datos de dirección (Fase 1)
  street VARCHAR(256),
  city VARCHAR(90),
  postal_code VARCHAR(90),
  country_id UUID, -- FK a investors.countries (residencia)
  province VARCHAR,
  
  -- Datos KYC/AML (Fase 2)
  occupation VARCHAR, -- Código PCS2020
  annual_income VARCHAR, -- Rango: 0-10K, 10K-25K, etc
  estimated_wealth VARCHAR, -- Rango: 0-50K, 50K-100K, etc
  pep_status VARCHAR, -- 'no', 'yes', 'close_to_pep'
  pep_position VARCHAR, -- POLITICAL_LEADER, etc (si pep_status = yes)
  pep_start_date DATE,
  pep_end_date DATE,
  origin_of_funds JSONB, -- Array: [INCOME, INVESTMENTS, INHERITANCE, ...]
  has_ifi_tax BOOLEAN,
  
  -- Linking
  payment_account_id UUID, -- FK a payments.payment_accounts (cuando se crea)
  lemonway_wallet_id VARCHAR, -- Wallet ID devuelto por Lemonway
  virtual_account_id UUID, -- FK a virtual_accounts.cuentas_virtuales (cuando se crea)
  
  -- Error tracking
  lemonway_error_message VARCHAR,
  last_error_at TIMESTAMP,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  -- URLs y resumption
  lemonway_resumption_url VARCHAR,
  
  -- Auditoría
  created_by_user_id UUID NOT NULL, -- FK a auth.users
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  kyc_1_completed_at TIMESTAMP, -- Cuando completó FASE 1 (creación de cuenta)
  kyc_2_completed_at TIMESTAMP, -- Cuando completó FASE 2 (verificación identidad)
  rejected_at TIMESTAMP,
  rejection_reason VARCHAR,
  
  -- Soft delete
  deleted_at TIMESTAMP,
  is_archived BOOLEAN DEFAULT false,
  
  FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id),
  FOREIGN KEY (birth_country_id) REFERENCES investors.countries(id),
  FOREIGN KEY (country_id) REFERENCES investors.countries(id),
  FOREIGN KEY (payment_account_id) REFERENCES payments.payment_accounts(id),
  FOREIGN KEY (virtual_account_id) REFERENCES virtual_accounts.cuentas_virtuales(id)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_request_reference ON investors.lemonway_account_requests(request_reference);
CREATE INDEX idx_request_email ON investors.lemonway_account_requests(email);
CREATE INDEX idx_request_status ON investors.lemonway_account_requests(status);
CREATE INDEX idx_request_lemonway_wallet ON investors.lemonway_account_requests(lemonway_wallet_id);
CREATE INDEX idx_request_created_by ON investors.lemonway_account_requests(created_by_user_id);
CREATE INDEX idx_request_deleted ON investors.lemonway_account_requests(deleted_at, is_archived);
```

---

## 5. ARQUITECTURA TÉCNICA ACTUALIZADA

### 5.1 Fase 1: Creación de Cuenta

**Componentes nuevos**:

1. **LemonwayAccountCreator** (`lib/lemonway-account-creator.ts`)
   - `createAccount(userData)` → wallet_id + resumption_url
   - `checkDuplicates(userData)` → lista de cuentas similares

2. **Endpoint**: `POST /api/admin/lemonway/accounts/create-account`
   - Input: personal_data, address, profile_type
   - Output: wallet_id, payment_account_id, virtual_account_id
   - **Integración con Cola**: Enqueued con prioridad NORMAL o URGENT

3. **Duplicate Checker** (`lib/lemonway-duplicate-checker.ts`)
   - Nivel 1: Búsqueda en URBIX BD
   - Nivel 2: Búsqueda en Lemonway (via error handling)
   - Nivel 3: Búsqueda fuzzy/similar

4. **UI Component**: `components/lemonway-admin/create-account-tab.tsx`
   - Formulario KYC Phase 1
   - Validación de duplicados
   - Confirmación antes de crear

### 5.1.1 Integración con Sistema de Cola Dual FIFO

**Sistema existente**: `lemonway_request_queue` con priorización URGENT/NORMAL

**Cómo funciona**:
```
1. ADMIN crea cuenta:
   └─ POST /api/admin/lemonway/accounts/create-account
      ├─ Valida duplicados (3 niveles)
      ├─ INSERT en lemonway_request_queue:
      │  ├─ id: UUID
      │  ├─ operation_type_id: 'account_creation'
      │  ├─ priority: 'URGENT' | 'NORMAL' (configurable por admin)
      │  ├─ endpoint: '/accounts/create-onboarding-session'
      │  ├─ http_method: 'POST'
      │  ├─ request_payload: { first_name, last_name, ... }
      │  ├─ status: 'pending'
      │  ├─ max_retries: 3
      │  ├─ created_by: admin_id
      │  └─ created_at: NOW()
      │
      └─ Respuesta: { queue_id, estimated_processing_time }
         (El procesamiento ocurre asincrónico)

2. LemonwayQueueProcessor procesa la cola:
   ├─ Cada 5 segundos consulta: SELECT * FROM lemonway_request_queue
   │  WHERE status = 'pending'
   │  ORDER BY priority = 'URGENT' DESC, created_at ASC
   │  LIMIT 1
   │
   ├─ Si priority = 'URGENT':
   │  └─ Procesa INMEDIATAMENTE (NO espera cola normal)
   │
   ├─ Si priority = 'NORMAL':
   │  └─ Respeta orden FIFO (primero llegó, primero sale)
   │
   └─ Actualiza status según resultado:
      ├─ SUCCESS: status = 'completed'
      ├─ RETRY: status = 'failed', next_retry_at = NOW() + backoff
      └─ PERMANENT_FAILURE: status = 'failed', no más reintentos

3. Admin/Dashboard puede monitorear:
   ├─ GET /api/admin/lemonway/queue
   │  └─ Ver todas las cuentas en cola (status pending/processing/completed)
   │
   ├─ Dashboard muestra:
   │  ├─ Cuentas URGENT pendientes: N
   │  ├─ Cuentas NORMAL pendientes: N
   │  ├─ En procesamiento: N
   │  ├─ Completadas (últimas 24h): N
   │  └─ Fallidas con reintento pendiente: N
   │
   └─ Opción: Reintento manual o cancelación de items fallidos
```

**Tabla involucrada**: `lemonway_temp.lemonway_request_queue`
```sql
{
  id: UUID,
  priority: 'URGENT' | 'NORMAL',
  operation_type_id: 'account_creation',
  endpoint: '/accounts/create-onboarding-session',
  http_method: 'POST',
  request_payload: JSONB,
  request_headers: JSONB,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  response_payload: JSONB,
  response_status: INT,
  retry_count: INT,
  max_retries: INT,
  next_retry_at: TIMESTAMP,
  error_message: TEXT,
  created_by: TEXT,
  created_at: TIMESTAMP,
  started_at: TIMESTAMP,
  completed_at: TIMESTAMP
}
```

**Configuración de reintentos**:
```
- max_retries: 3 (por defecto)
- backoff_multiplier: 2 (exponencial: 1s, 2s, 4s)
- Primera falla: reintento en 1 segundo
- Segunda falla: reintento en 2 segundos
- Tercera falla: reintento en 4 segundos
- Si falla 3 veces: PERMANENT_FAILURE, marcar manual_review_needed
```

**Ventajas de usar la cola**:
- ✓ Procesamientos no-bloqueantes (crear cuenta no espera)
- ✓ Priorización inteligente (inversores críticos first)
- ✓ Reintentos automáticos con backoff
- ✓ Auditoría completa (cada intento registrado)
- ✓ Rate limiting integrado (no sobrecarga Lemonway)
- ✓ Recuperación de fallos (si Lemonway cae, reintentos después)

### 5.2 FASE 2: Verificación de Identidad

**Componentes nuevos**:

1. **LemonwayKYCHandler** (`lib/lemonway-kyc-handler.ts`)
   - `initiateKYC(wallet_id)` → resumption_url
   - `handleKYCEvent(event)` → procesar webhook
   - `updateAccountStatus(wallet_id, status)`

2. **Webhook Endpoint**: `POST /api/webhooks/lemonway/kyc-events`
   - Recibir eventos de Lemonway
   - Validar firma de webhook
   - Procesar y actualizar BD

3. **UI Component**: `components/lemonway-admin/verify-kyc-tab.tsx`
   - Mostrar status KYC de cuentas
   - Enlace a resumption URL para usuarios
   - Historial de eventos KYC

---

## 6. CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Account Creation
- [ ] Tabla `payment_accounts` con nuevas columnas
- [ ] Tabla `lemonway_account_creation_logs`
- [ ] `LemonwayAccountCreator` service
- [ ] `LemonwayDuplicateChecker` service
- [ ] Endpoint `POST /api/admin/lemonway/accounts/create-account`
- [ ] Endpoint `GET /api/admin/lemonway/accounts/check-duplicates`
- [ ] UI: Create Account Tab en dashboard
- [ ] Tests de creación y duplicados
- [ ] Rate limiting (50 cuentas/hora)
- [ ] Auditoría (lemonway_account_creation_logs)

### Fase 2: KYC Verification
- [ ] Tabla `lemonway_kyc_events`
- [ ] `LemonwayKYCHandler` service
- [ ] Webhook endpoint validación de firma
- [ ] Workflow "lemonway_kyc_approved"
- [ ] Workflow "lemonway_kyc_rejected"
- [ ] UI: Verify KYC Tab en dashboard
- [ ] Email notifications para eventos KYC
- [ ] Tests de webhook handling
- [ ] Retry logic for failed events

---

## 7. ESTRATEGIA DETALLADA DE VALIDACIÓN DE DUPLICADOS

### 7.1 Problema
Lemonway exige uniqueness en: **first_name + last_name + birthdate + birthcountry**. Si intentamos crear un duplicado, Lemonway rechazará la solicitud con error `DUPLICATE_ACCOUNT`.

### 7.2 Solución: 3 Niveles de Validación (PRE-CREACIÓN)

#### **NIVEL 1: Validación Local (URBIX BD)**
**Búsqueda en tabla `payment_accounts`:**
```sql
WHERE first_name = ? 
  AND last_name = ?
  AND birthdate = ?
  AND birthcountry = ?
  AND lemonway_account_status IN ('ACCOUNT_CREATED', 'PENDING_KYC', 'KYC-1 Completo', 'KYC-2 Completo', 'VERIFIED')
```

**Ventajas**:
- ✓ Rápido (búsqueda local)
- ✓ Detecta duplicados recientes
- ✓ Previene creaciones múltiples simultáneas

**Desventajas**:
- ✗ No detecta si Lemonway tiene cuenta más antigua no sincronizada
- ✗ BD local puede estar desactualizada

---

#### **NIVEL 2: Validación en Lemonway (API) - Error Handling**
**POST /accounts/create-onboarding-session + Error Handling (RECOMENDADO)**
```typescript
1. Intentar crear cuenta en Lemonway
2. Si Lemonway responde error "DUPLICATE_ACCOUNT":
   - Extraer wallet_id del error
   - Buscar cuenta existente: GET /accounts/{walletId}
   - Mostrar opción: "Vincular cuenta existente" o "Reintentar con datos diferentes"
```

**Ventajas**:
- ✓ Source of truth (Lemonway valida)
- ✓ Detecta duplicados globales
- ✓ Evita crear cuentas redundantes
- ✓ Funciona con API disponible de Lemonway

**Desventajas**:
- ✗ Más lento (requiere API call a Lemonway)
- ✗ Falla después de intentar crear (menos ideal pero es el único método disponible)

---

#### **NIVEL 3: Búsqueda Fuzzy (Similitud/Typos)**

**Detectar duplicados con pequeñas diferencias:**
```
Casos a detectar:
1. Mismo nombre completo pero typos: "Juan" vs "Jua " (espacio)
2. Acentos: "José" vs "Jose"
3. Variaciones: "María" vs "Maria"
4. Mismo apellido/nombre pero diferente país: "Juan García" España vs Brasil

Usar: Levenshtein distance (similitud > 85%)
```

**Algoritmo**:
```
1. Si NIVEL 1 no encuentra coincidencia exacta
2. Buscar en URBIX con Levenshtein distance > 85%
3. Si hay coincidencias similares:
   - ALERTAR al admin: "¿Posible duplicado?"
   - Mostrar lista de coincidencias similares
   - Opción: "Confirmar creación de todas formas" o "Cancelar"
   - Si elige Opción 2 → CONTINUAR
4. Si NIVEL 2 no encuentra coincidencia exacta
5. Buscar en URBIX con Levenshtein distance > 85%
6. Si hay coincidencias similares:
   - ALERTAR al admin: "¿Posible duplicado?"
   - Mostrar lista de coincidencias similares
   - Opción: "Confirmar creación de todas formas" o "Cancelar"
   - Si elige Opción 2 → CONTINUAR
7. Si NIVEL 3 no encuentra coincidencia exacta
8. Buscar en URBIX con Levenshtein distance > 85%
9. Si hay coincidencias similares:
   - ALERTAR al admin: "¿Posible duplicado?"
   - Mostrar lista de coincidencias similares
   - Opción: "Confirmar creación de todas formas" o "Cancelar"
   - Si elige Opción 2 → CONTINUAR
```

**Ventajas**:
- ✓ Detecta typos y acentos
- ✓ Previene duplicados por error de datos
- ✗ Requiere cálculo extra (menos crítico)

---

### 7.3 Flujo de Validación Completo

```
INICIO: Usuario completa formulario de creación de cuenta
│
├─ 1. VALIDACIÓN NIVEL 1 (BD Local)
│   │
│   ├─ ¿Coincidencia EXACTA en payment_accounts?
│   │  └─ SI → RECHAZAR "Cuenta existente en URBIX"
│   │  └─ NO → CONTINUAR
│   │
│   └─ ¿Coincidencia SIMILAR (Levenshtein > 85%)?
│      └─ SI → ALERTAR "¿Posible duplicado?" + Mostrar opciones
│      │       [Opción 1: Cancelar] [Opción 2: Crear de todas formas]
│      │       └─ Si elige Opción 2 → CONTINUAR
│      └─ NO → CONTINUAR
│
├─ 2. INTENTO DE CREACIÓN EN LEMONWAY
│   │
│   ├─ POST /accounts/create-onboarding-session
│   │  └─ Enviar: first_name, last_name, birthdate, birthcountry, etc.
│   │
│   └─ ¿Respuesta de Lemonway?
│      │
│      ├─ ERROR "DUPLICATE_ACCOUNT"
│      │  ├─ Extraer wallet_id del error
│      │  ├─ Buscar: GET /accounts/{walletId}
│      │  ├─ MOSTRAR AL ADMIN:
│      │  │  "Cuenta ya existe en Lemonway"
│      │  │  [Detalles de cuenta existente]
│      │  │  [Opción 1: Vincular cuenta existente a URBIX]
│      │  │  [Opción 2: Reintentar con datos diferentes]
│      │  │  [Opción 3: Cancelar]
│      │  │
│      │  └─ Si elige Opción 1:
│      │     - Crear payment_account vinculada
│      │     - Status: ACCOUNT_CREATED (sin crear en Lemonway)
│      │     - REGISTRAR en audit logs
│      │     - FINALIZAR
│      │
│      ├─ SUCCESS (wallet_id devuelto)
│      │  ├─ GUARDAR wallet_id
│      │  ├─ GUARDAR resumption_url
│      │  ├─ Crear payment_account con status PENDING_KYC
│      │  ├─ Crear virtual_account (INACTIVE)
│      │  ├─ REGISTRAR en lemonway_account_creation_logs
│      │  ├─ Disparar workflow "lemonway_account_created"
│      │  └─ MOSTRAR ÉXITO "Cuenta creada en Lemonway"
│      │
│      └─ ERROR (otro error)
│         ├─ REGISTRAR error detallado en logs
│         ├─ MOSTRAR ERROR al admin
│         └─ Opción: "Reintentar"
│
└─ FIN
```

---

### 7.4 Campos a Validar (en orden de importancia)

| Nivel | Campos | Tipo | Acción |
|-------|--------|------|--------|
| 1 | first_name + last_name + birthdate + birthcountry | EXACTO | RECHAZAR |
| 2 | email | EXACTO | ALERTAR |
| 3 | first_name + last_name + birthdate (sin country) | EXACTO | ALERTAR |
| 4 | first_name + last_name (sin fecha ni país) | FUZZY (>85%) | ALERTAR |
| 5 | phone number | EXACTO | ALERTAR (posible mismo usuario) |

---

### 7.5 Implementación: Services Necesarios

#### **`LemonwayDuplicateChecker` (`lib/lemonway-duplicate-checker.ts`)**
```typescript
class LemonwayDuplicateChecker {
  
  // NIVEL 1: Búsqueda exacta en BD local
  async checkExactInLocal(userData): Promise<PaymentAccount | null>
  
  // NIVEL 2: Búsqueda similar en BD local (Levenshtein)
  async checkSimilarInLocal(userData): Promise<PaymentAccount[]>
  
  // NIVEL 3: Extrae wallet_id del error de Lemonway
  async extractWalletFromError(lemonwayError): Promise<string>
  
  // NIVEL 3: Valida todo - retorna: { 
  //   status: 'EXACT_MATCH' | 'SIMILAR_MATCHES' | 'READY_TO_CREATE' 
  //   matches: PaymentAccount[], 
  //   shouldProceed: boolean 
  // }
  async validateBeforeCreation(userData): Promise<ValidationResult>
}
```

#### **`LemonwayAccountCreator` (`lib/lemonway-account-creator.ts`)**
```typescript
class LemonwayAccountCreator {
  
  // Crea cuenta en Lemonway + maneja duplicados
  async createAccountWithDuplicateHandling(userData): Promise<{
    wallet_id: string
    resumption_url: string
    was_linked: boolean // true si fue vinculación, false si creación nueva
  }>
}
```

---

### 7.6 Endpoint: Check Duplicates

**Endpoint**: `GET /api/admin/lemonway/accounts/check-duplicates`

**Request**:
```json
{
  "first_name": "Juan",
  "last_name": "García",
  "birthdate": "1990-01-15",
  "birthcountry": "ES",
  "email": "juan@example.com"
}
```

**Response - Caso 1 (Exacta)**:
```json
{
  "status": "EXACT_MATCH",
  "exact_match": {
    "wallet_id": "WALLET_123",
    "email": "juan@example.com",
    "lemonway_account_status": "VERIFIED",
    "payment_account_id": "PA_456"
  },
  "should_proceed": false
}
```

**Response - Caso 2 (Similar)**:
```json
{
  "status": "SIMILAR_MATCHES",
  "similar_matches": [
    {
      "wallet_id": "WALLET_124",
      "first_name": "Jua",
      "last_name": "Garcia",
      "similarity_score": 0.92,
      "lemonway_account_status": "PENDING_KYC"
    }
  ],
  "should_proceed": true, // User puede optar por crear igual
  "message": "Existen cuentas similares - revisar antes de crear"
}
```

**Response - Caso 3 (No duplicado)**:
```json
{
  "status": "READY_TO_CREATE",
  "similar_matches": [],
  "should_proceed": true
}
```

---

### 7.7 Decisión Final: Opción Recomendada

**Opción RECOMENDADA**: 
- ✓ NIVEL 1 + NIVEL 3 (búsquedas local + fuzzy matching)
- ✓ NIVEL 2 via error handling de Lemonway (cuando falla creación)
- ✓ Pre-check con endpoint `GET /check-duplicates` antes de crear
- ✓ User education: "Si existe similar, revisar primero"

**Ventajas**:
- Rápido (búsquedas locales en primer lugar)
- Seguro (valida contra Lemonway en creación)
- UX amigable (alertas, no bloqueos innecesarios)
- Auditable (registro completo de decisiones)

---

## 8. SISTEMA DE SOLICITUDES DE CREACIÓN (REQUEST TRACKING)

### 8.1 Propósito

Crear un sistema robusto de rastreo de solicitudes de cuenta para permitir:
- ✅ Identificar cada solicitud con ID único y referencia legible
- ✅ Rastrear ciclo de vida completo de la solicitud
- ✅ Recuperar solicitudes fallidas o incompletas
- ✅ Auditar todas las operaciones de creación de cuenta
- ✅ Permitir corrección y reenvío si hay validación fallida

### 8.2 Nueva Tabla: `investors.lemonway_account_requests`

**Estructura SQL**:
```sql
CREATE TABLE investors.lemonway_account_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_reference VARCHAR(20) UNIQUE NOT NULL, -- REQ-2025-001, REQ-2025-002, etc
  status VARCHAR NOT NULL DEFAULT 'DRAFT',
    -- Estados: DRAFT, SUBMITTED, KYC-1 Completo, KYC-2 Completo, ACTIVE, 
    -- INVALID, REJECTED, CANCELLED
  validation_status VARCHAR DEFAULT 'PENDING',
    -- PENDING, VALID, INVALID - Pre-validación de formato
  validation_errors JSONB, -- Errores de validación (qué campo falló)
  
  -- Datos personales (de Fase 1)
  first_name VARCHAR(35) NOT NULL,
  last_name VARCHAR(35) NOT NULL,
  birth_date DATE NOT NULL,
  email VARCHAR(60) NOT NULL,
  phone_number VARCHAR(20),
  birth_country_id UUID NOT NULL, -- FK a investors.countries
  nationality_ids UUID[] NOT NULL, -- Array de FK a investors.countries
  profile_type VARCHAR NOT NULL, -- PROJECT_HOLDER, DONOR, etc
  
  -- Datos de dirección (Fase 1)
  street VARCHAR(256),
  city VARCHAR(90),
  postal_code VARCHAR(90),
  country_id UUID, -- FK a investors.countries (residencia)
  province VARCHAR,
  
  -- Datos KYC/AML (Fase 2)
  occupation VARCHAR, -- Código PCS2020
  annual_income VARCHAR, -- Rango: 0-10K, 10K-25K, etc
  estimated_wealth VARCHAR, -- Rango: 0-50K, 50K-100K, etc
  pep_status VARCHAR, -- 'no', 'yes', 'close_to_pep'
  pep_position VARCHAR, -- POLITICAL_LEADER, etc (si pep_status = yes)
  pep_start_date DATE,
  pep_end_date DATE,
  origin_of_funds JSONB, -- Array: [INCOME, INVESTMENTS, INHERITANCE, ...]
  has_ifi_tax BOOLEAN,
  
  -- Linking
  payment_account_id UUID, -- FK a payments.payment_accounts (cuando se crea)
  lemonway_wallet_id VARCHAR, -- Wallet ID devuelto por Lemonway
  virtual_account_id UUID, -- FK a virtual_accounts.cuentas_virtuales (cuando se crea)
  
  -- Error tracking
  lemonway_error_message VARCHAR,
  last_error_at TIMESTAMP,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  
  -- URLs y resumption
  lemonway_resumption_url VARCHAR,
  
  -- Auditoría
  created_by_user_id UUID NOT NULL, -- FK a auth.users
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  submitted_at TIMESTAMP,
  kyc_1_completed_at TIMESTAMP, -- Cuando completó FASE 1 (creación de cuenta)
  kyc_2_completed_at TIMESTAMP, -- Cuando completó FASE 2 (verificación identidad)
  rejected_at TIMESTAMP,
  rejection_reason VARCHAR,
  
  -- Soft delete
  deleted_at TIMESTAMP,
  is_archived BOOLEAN DEFAULT false,
  
  FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id),
  FOREIGN KEY (birth_country_id) REFERENCES investors.countries(id),
  FOREIGN KEY (country_id) REFERENCES investors.countries(id),
  FOREIGN KEY (payment_account_id) REFERENCES payments.payment_accounts(id),
  FOREIGN KEY (virtual_account_id) REFERENCES virtual_accounts.cuentas_virtuales(id)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_request_reference ON investors.lemonway_account_requests(request_reference);
CREATE INDEX idx_request_email ON investors.lemonway_account_requests(email);
CREATE INDEX idx_request_status ON investors.lemonway_account_requests(status);
CREATE INDEX idx_request_lemonway_wallet ON investors.lemonway_account_requests(lemonway_wallet_id);
CREATE INDEX idx_request_created_by ON investors.lemonway_account_requests(created_by_user_id);
CREATE INDEX idx_request_deleted ON investors.lemonway_account_requests(deleted_at, is_archived);
```

### 8.3 Ciclo de Vida de Solicitudes

```
DRAFT
  ↓
  [Admin rellena formulario Fase 1]
  [Valida duplicados]
  [Click "Enviar a Cola"]
  ↓
SUBMITTED
  ↓
  [Enqueued en lemonway_request_queue]
  [Si INVALID → estado INVALID, mostrar errores, permitir corrección]
  [Si éxito → payment_accounts creada, wallet_id asignado]
  ↓
PENDING_KYC
  ↓
  [Admin completa formulario Fase 2 (opcional inmediato)]
  [O usuario completa en Lemonway]
  [Onboarding iniciado]
  ↓
KYC_VERIFIED (si Lemonway aprueba) O REJECTED (si Lemonway rechaza)
  ↓
ACCOUNT_CREATED
  ↓
ACTIVE (listo para transacciones)


Estados posibles en cualquier momento:
- INVALID: Validación fallida (errores específicos en validation_errors)
- CANCELLED: Admin cancela solicitud manual
- REJECTED: Lemonway rechaza la solicitud (motivo en rejection_reason)
```

### 8.4 CRUD de Solicitudes

#### **CREATE: `POST /api/admin/lemonway/requests`**
```typescript
Input:
{
  first_name: "Juan",
  last_name: "García",
  birth_date: "1990-01-15",
  email: "juan@example.com",
  phone_number: "+34689222211",
  birth_country_id: "uuid-ES",
  nationality_ids: ["uuid-ES", "uuid-FR"],
  profile_type: "PROJECT_HOLDER",
  street: "Calle Mayor 123",
  city: "Madrid",
  postal_code: "28001",
  country_id: "uuid-ES",
  priority: "URGENT" // o "NORMAL"
}

Output:
{
  id: "uuid",
  request_reference: "REQ-2025-001",
  status: "SUBMITTED",
  validation_status: "VALID",
  payment_account_id: "uuid",
  lemonway_wallet_id: "LW-12345",
  queue_id: "uuid"
}
```

#### **READ LIST: `GET /api/admin/lemonway/requests`**
```typescript
Query params:
  ?status=DRAFT,SUBMITTED,PENDING_KYC
  ?email=juan@example.com
  ?created_after=2025-01-01
  ?created_by=user-uuid
  ?page=1&limit=20

Output:
{
  data: [
    {
      id, request_reference, status, validation_status,
      first_name, last_name, email, created_at,
      created_by, payment_account_id
    }
  ],
  pagination: { total, page, limit }
}
```

#### **READ DETAIL: `GET /api/admin/lemonway/requests/:request_id`**
```typescript
Output:
{
  id, request_reference, status, validation_status,
  first_name, last_name, birth_date, email, phone_number,
  birth_country: { id, code_iso2, name_en },
  street, city, postal_code, country: { ... },
  payment_account_id, lemonway_wallet_id, virtual_account_id,
  validation_errors: { field1: "error1", field2: "error2" },
  lemonway_error_message,
  retry_count, max_retries,
  created_at, submitted_at, kyc_1_completed_at, kyc_2_completed_at,
  created_by: { id, email, first_name }
}
```

#### **UPDATE: `PATCH /api/admin/lemonway/requests/:request_id`**
```typescript
// Solo permitido si status = INVALID o DRAFT

Input:
{
  first_name: "Juan",
  last_name: "García",
  // ... campos a actualizar
  resubmit: true // Si es true, cambiar status a SUBMITTED
}

Output:
{
  id, request_reference, status: "SUBMITTED",
  validation_status: "VALID"
}
```

#### **DELETE (Soft Delete): `DELETE /api/admin/lemonway/requests/:request_id`**
```typescript
// Soft delete: marcar deleted_at y is_archived

Output:
{
  id, request_reference, 
  deleted_at: "2025-01-13T15:30:00Z",
  is_archived: true
}
```

#### **RECOVER: `POST /api/admin/lemonway/requests/:request_id/recover`**
```typescript
// Reintentar solicitud fallida (status = INVALID, REJECTED)

Input:
{
  changes: { // Cambios opcionales a aplicar
    first_name: "Juan"
  }
}

Output:
{
  request_reference: "REQ-2025-001",
  status: "SUBMITTED",
  validation_status: "VALID",
  retry_count: 1, // Incrementado
  message: "Solicitud reenviada exitosamente"
}
```

### 8.5 Manejo de Validaciones Fallidas

#### **Validación Fallida (INVALID Status)**

Cuando una solicitud falla validación:

```typescript
// El endpoint devuelve 422 Unprocessable Entity
{
  request_id: "uuid",
  request_reference: "REQ-2025-001",
  status: "INVALID",
  validation_status: "INVALID",
  validation_errors: {
    first_name: "Contiene caracteres especiales inválidos: ? !",
    birth_date: "Menor de 18 años",
    email: "Formato inválido"
  }
}
```

**Casos de validación fallida**:
1. Nombre/apellido con caracteres prohibidos (?, !, §, &, #, etc)
2. Fecha de nacimiento < 18 años
3. Email inválido
4. País no activo (is_active = false)
5. Teléfono inválido (no coincide regex)
6. Campos obligatorios vacíos

**UI mostrará**:
```
❌ Validación Fallida
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Primera Ej., "Juan García"
  ❌ Contiene caracteres especiales inválidos: ? !

Fecha de Nacimiento: "2010-01-15"
  ❌ Menor de 18 años

Email: "juan@"
  ❌ Formato inválido

[Corregir y Reenviar]  [Descartar]
```

#### **Recuperación después de corrección**

1. Admin ve solicitud en estado INVALID
2. Admin abre formulario de corrección
3. Admin corrige campos con errores
4. Click "Corregir y Reenviar"
5. Solicitud pasa a validación nuevamente
6. Si pasa: status → SUBMITTED, enqueue en cola
7. Si falla: vuelve a estado INVALID con nuevos errores

```typescript
// POST /api/admin/lemonway/requests/:request_id/recover

{
  first_name: "Juan María", // Corregido
  birth_date: "1990-01-15", // Corregido
  email: "juan@example.com" // Corregido
}

// Response:
{
  request_reference: "REQ-2025-001",
  status: "SUBMITTED",
  validation_status: "VALID",
  retry_count: 1, // Incrementado
  message: "Solicitud reenviada exitosamente"
}
```

---

## 9. REGLAS DE VALIDACIÓN DE LEMONWAY (SEGÚN DOCUMENTACIÓN OFICIAL)

### 9.1 Validaciones de Campos Obligatorios

| Campo | Regla | Mensaje de Error |
|-------|-------|-----------------|
| **First Name** | 1–35 caracteres, EXCLUYE: `?!§&#{[\@]}=+^$%*<>;""` | "Contiene caracteres inválidos" |
| **Last Name** | 1–35 caracteres, EXCLUYE: `?!§&#{[\@]}=+^$%*<>;""` | "Contiene caracteres inválidos" |
| **Email** | RFC 5322 válido, máx 60 caracteres | "Email inválido" |
| **Phone** | Formato internacional: +[country][number] | "Formato de teléfono inválido" |
| **Birth Date** | DD/MM/YYYY, años 1920–presente, **edad ≥18** | "Menor de 18 años" O "Fecha inválida" |
| **Birth Country** | ISO 3166-2 válido, no restringido | "País no permitido" |
| **Nationality** | ISO 3166-2 válido, array | "Nacionalidad inválida" |

### 9.2 Validaciones de Campos Opcionales (Fase 2 KYC)

| Campo | Regla | Mensaje |
|-------|-------|---------|
| **Birth City** | 1–90 caracteres | "Ciudad inválida" |
| **Street** | 1–256 caracteres | "Calle inválida" |
| **Postal Code** | Alfanumérico, 1–90 caracteres | "Código postal inválido" |
| **City** | 1–90 caracteres | "Ciudad inválida" |
| **Country of Residence** | ISO 3166-2 válido | "País inválido" |
| **Occupation** | Código PCS2020 válido | "Ocupación inválida" |
| **Annual Income** | Enum: `0-10K`, `10K-25K`, `25K-50K`, `50K-100K`, `>100K` | "Rango inválido" |
| **Estimated Wealth** | Enum: `0-50K`, `50K-100K`, `100K-500K`, `>500K` | "Rango inválido" |
| **PEP Status** | Enum: `no`, `yes`, `close_to_pep` | "Estado PEP inválido" |
| **PEP Position** | Enum si pep_status=yes | "Posición PEP inválida" |
| **Origin of Funds** | Array: `[INCOME, INVESTMENTS, INHERITANCE, BUSINESS, OTHER]` | "Origen inválido" |
| **IFI Tax** | Boolean | "Valor inválido" |
| **Project Type** | Enum: `WEDDING`, `FAREWELL`, `NEW_BORN`, `BIRTHDAY`, `CHARITY`, `OTHER` | "Tipo proyecto inválido" |
| **Project Website** | URL válida (http, www) | "URL inválida" |

### 9.3 Validación de Caracteres Permitidos

**PROHIBIDOS en nombre/apellido**: `? ! § & # { [ \ @ ] } = + ^ $ % * < > ; "`
**PERMITIDOS**: guiones (`-`), apóstrofes (`'`), acentos, Ł, Ø

Ejemplos:
- ✅ "Juan" → OK
- ✅ "José María" → OK (acentos)
- ✅ "Jean-Pierre" → OK (guión)
- ✅ "O'Brien" → OK (apóstrofe)
- ❌ "Juan?" → NO (signo de interrogación)
- ❌ "María & Juan" → NO (ampersand)

### 9.4 Validación de Edad

```sql
birth_date < HOY - 18 años
Ejemplos (HOY = 13/01/2025):
  - 1990-01-15 → edad 35 → ✅ OK
  - 2006-12-31 → edad 18 → ✅ OK
  - 2007-01-14 → edad 17 → ❌ RECHAZAR (< 18)
```

### 9.5 Validación de País

Campos `birth_country`, `country_of_residence`, `nationality`:
- Deben estar en tabla `investors.countries`
- Deben tener `is_active = true`
- Deben tener `is_restricted = false` (excepto si admin aprueba explícitamente)

**Países restringidos típicos**: Cuba, Irán, Corea del Norte, Siria, Sudán, etc.

### 9.6 Validación de Unicidad (Lemonway)

Lemonway valida que NO exista otra cuenta con:
```sql
first_name = ? 
AND last_name = ?
AND birth_date = ?
AND birth_country = ?
```

Si existe: Lemonway retorna error `DUPLICATE_ACCOUNT` (gestionar en NIVEL 2 de duplicados)

---

## 10. VALIDACIÓN INTEGRADA EN FORMULARIO (CLIENT-SIDE)

Todas las reglas de Lemonway DEBEN ser validadas en el formulario antes de enviar:

```typescript
// lib/validators/lemonway-validators.ts

export const validateLemonwayName = (name: string): string | null => {
  if (!name || name.length < 1 || name.length > 35) 
    return "Nombre debe tener 1–35 caracteres"
  
  const invalidChars = /[?!§&#{[\@]}=+^$%*<>;""]/
  if (invalidChars.test(name))
    return "Contiene caracteres especiales inválidos"
  
  return null
}

export const validateLemonwayBirthDate = (birthDate: Date): string | null => {
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  
  if (age < 18) return "Debe ser mayor de 18 años"
  if (birthDate.getFullYear() < 1920) return "Año de nacimiento inválido"
  if (birthDate > today) return "Fecha no puede ser futura"
  
  return null
}

export const validateLemonwayPhone = (phone: string): string | null => {
  const phoneRegex = /^\+\d{1,3}\d{6,14}$/
  if (!phoneRegex.test(phone))
    return "Formato: +[country code][número]"
  
  return null
}
```

**Mostrar validación en tiempo real en el formulario** (feedback inmediato mientras escribe)
