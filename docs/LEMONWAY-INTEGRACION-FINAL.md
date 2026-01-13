# Integración Final: Cola + Auditoría + Webhooks

## Resumen Ejecutivo

Este documento especifica cómo se integran los 3 pilares del sistema Lemonway de URBIX:

1. **Cola FIFO Dual (Procesamiento Asincrónico)**
2. **Auditoría Centralizada (Trazabilidad Completa)**
3. **Webhooks de Lemonway (Sincronización en Tiempo Real)**

---

## 1. FLUJO INTEGRADO COMPLETO: Creación de Cuenta

```
[ADMIN] Crea Cuenta
    ↓
[VALIDACIÓN]
├─ Validar formato (nombres, email, fechas)
├─ Validar duplicados (3 niveles: URBIX BD, Fuzzy, Lemonway)
├─ Registrar en AccessLog: ALLOWED ✓
└─ Crear request en status DRAFT
    ↓
[CREAR PAYMENT_ACCOUNT]
├─ INSERT en payments.payment_accounts (wallet_id = NULL aún)
├─ INSERT en payment_account con status PENDING_ACCOUNT_CREATION
└─ Registrar acción en UserAuditLog
    ↓
[ENQUEUE EN COLA]
├─ INSERT en lemonway_request_queue:
│  ├─ priority: URGENT (si admin lo marca) o NORMAL
│  ├─ status: 'pending'
│  ├─ operation_type_id: 'account_creation'
│  ├─ endpoint: '/accounts/create-onboarding-session'
│  ├─ http_method: 'POST'
│  ├─ request_payload: {...datos de creación...}
│  ├─ max_retries: 3
│  └─ created_by: admin_id
│
├─ Actualizar request status → SUBMITTED
├─ Registrar en AccessLog: account_creation ALLOWED ✓
└─ Respuesta al usuario: "Creación enqueued, ID: REQ-2025-001"
    ↓
[PROCESAMIENTO ASINCRÓNICO - LemonwayQueueProcessor]
├─ Cada 5 segundos consulta: SELECT * FROM lemonway_request_queue
│  WHERE status = 'pending'
│  ORDER BY priority DESC, created_at ASC
│  LIMIT 1
│
├─ Obtiene config desde DB: getLemonwayConfigFromDB()
├─ Obtiene Bearer Token vía OAuth
├─ Construye payload con datos de payment_account
├─ POST a Lemonway /accounts/create-onboarding-session
│
├─ SI ÉXITO (200):
│  ├─ Recibe wallet_id y resumption_url
│  ├─ Actualizar lemonway_request_queue: status = 'completed'
│  ├─ Actualizar payment_accounts:
│  │  ├─ lemonway_wallet_id = wallet_id
│  │  ├─ status = 'KYC-1 Completo'
│  │  ├─ last_sync_at = NOW()
│  │  └─ lemonway_resumption_url = resumption_url
│  ├─ Crear virtual_accounts.cuentas_virtuales:
│  │  ├─ id = wallet_id (usar wallet_id como ID en Lemonway)
│  │  ├─ payment_account_id = fk
│  │  ├─ status = 'PENDING_KYC'
│  │  ├─ kyc_status = 'PENDING'
│  │  └─ saldo_disponible = 0
│  ├─ Crear movimiento inicial: tipo ACCOUNT_CREATED
│  ├─ Registrar en UserAuditLog: action = 'lemonway_account_created'
│  └─ Registrar en AccessLog: lemonway:account:create ALLOWED ✓
│
└─ SI ERROR (4xx/5xx):
   ├─ error_message guardado en BD
   ├─ Si es retry < max_retries:
   │  ├─ Calcular next_retry_at = NOW() + exponential_backoff
   │  └─ status = 'pending' (se reintentará)
   ├─ Si retry >= max_retries:
   │  ├─ status = 'failed'
   │  ├─ Actualizar request: status = 'REJECTED'
   │  ├─ Notificar admin en AccessLog: ERROR
   │  └─ Crear tarea de revisión manual
   └─ Registrar intento fallido en AccessLog

    ↓
[WEBHOOK DE LEMONWAY - KYC/ONBOARDING]

Usuario completa KYC en plataforma Lemonway
    ↓
Lemonway envía webhook:
    POST /api/webhooks/lemonway/kyc-events
    {
      "event_id": "evt_xyz",
      "event_type": "KYC_VALIDATED" | "KYC_REJECTED" | "ADDITIONAL_INFO",
      "wallet_id": "wallet_abc123",
      "timestamp": "2025-01-13T16:00:00Z",
      "data": {...},
      "signature": "hmac_sha256_signature"
    }
    ↓
[VALIDACIÓN DE WEBHOOK]
├─ Recuperar webhook_secret desde DB: getLemonwayWebhookSecret()
├─ Validar firma: HMAC-SHA256(payload, secret)
├─ SI inválida → Rechazar 401
└─ SI válida → Procesar
    ↓
[PROCESAR SEGÚN EVENTO]

Si KYC_VALIDATED:
├─ Buscar request en BD por wallet_id
├─ Actualizar request: status = 'KYC-2 Completo'
├─ Actualizar payment_accounts: kyc_status = 'VERIFIED'
├─ Actualizar cuentas_virtuales: status = 'ACTIVE', kyc_status = 'VERIFIED'
├─ Crear movimiento: tipo = 'KYC_APPROVED'
├─ Registrar en UserAuditLog: 'lemonway_kyc_approved'
├─ Registrar en AccessLog: lemonway:kyc:verify ALLOWED ✓
├─ Disparar workflow: 'lemonway_kyc_approved'
├─ Enviar email: "Cuenta verificada ✓"
└─ Respuesta webhook: 200 OK

Si KYC_REJECTED:
├─ Actualizar request: status = 'REJECTED'
├─ Guardar rejection_reason
├─ Actualizar cuentas_virtuales: status = 'INACTIVE', kyc_status = 'REJECTED'
├─ Registrar en AccessLog: lemonway:kyc:verify DENIED (razón del rechazo)
├─ Registrar en UserAuditLog: 'lemonway_kyc_rejected'
├─ Crear tarea: "Revisar rechazo KYC para REQ-2025-001"
├─ Disparar workflow: 'lemonway_kyc_rejected'
├─ Enviar email: "Documentos rechazados, motivo: ..."
└─ Respuesta webhook: 200 OK

Si ADDITIONAL_INFO_REQUIRED:
├─ Crear tarea: "Información adicional requerida para REQ-2025-001"
├─ Registrar evento en lemonway_kyc_events
├─ Disparar workflow: 'lemonway_info_required'
├─ Enviar email con detalles de información requerida
└─ Respuesta webhook: 200 OK
```

---

## 2. AUDITORÍA INTEGRADA EN CADA PASO

### Tabla: AccessLog
Registra **todos los accesos** (permitidos y denegados) con contexto completo.

```sql
INSERT INTO "AccessLog" (
  "userId", "userEmail", "userRole",
  resource, action, allowed, "deniedReason",
  "ipAddress", "userAgent", "requestPath", "requestMethod",
  metadata
) VALUES (...)
```

**Ejemplo**: Admin crea cuenta
```
resource: "lemonway"
action: "account:create"
allowed: true
userId: "admin_user_id"
ipAddress: "192.168.1.100"
userAgent: "Mozilla/5.0..."
requestPath: "/api/admin/lemonway/accounts/create-account"
requestMethod: "POST"
metadata: {
  "request_reference": "REQ-2025-001",
  "email": "investor@example.com"
}
```

**Ejemplo**: Webhook rechazado por firma inválida
```
resource: "lemonway"
action: "webhook:kyc_event"
allowed: false
deniedReason: "Invalid signature"
ipAddress: "api.lemonway.com"
metadata: {
  "event_type": "KYC_VALIDATED",
  "wallet_id": "wallet_xyz"
}
```

### Tabla: UserAuditLog
Registra **cambios en datos** de usuarios/cuentas.

```sql
INSERT INTO "UserAuditLog" (
  "userId",        -- cuenta que fue modificada
  "action",        -- acción realizada
  "changedBy",     -- admin que la hizo
  "changes",       -- detalles JSONB
  "ipAddress"
) VALUES (...)
```

**Ejemplo**: KYC completado
```
userId: "REQ-2025-001"           -- ID de la solicitud
action: "lemonway_kyc_approved"
changedBy: "lemonway_system"      -- Sistema
changes: {
  "status": "KYC-2 Completo",
  "kyc_status": "VERIFIED",
  "wallet_id": "wallet_abc123",
  "verified_at": "2025-01-13T16:30:00Z"
}
```

### Dashboard: Access Logs
**URL**: `/dashboard/access-logs`
- Tarjetas: Total, Permitidos, Denegados, Usuarios Únicos
- Filtros: Estado, Recurso, Usuario
- Tabla paginada con detalles completos
- Refresh automático

---

## 3. FLUJO DE CONFIGURACIÓN (BD-Centric)

```
PRIMER DEPLOY
    ↓
Admin accede a /dashboard/lemonway-config
    ↓
Rellena formulario:
├─ Entorno: sandbox | production
├─ API Token: Base64 OAuth credentials
├─ Wallet ID: sc_xxxxx o similar
├─ Webhook Secret: para validar webhooks
└─ URLs opcionales: si no es default
    ↓
SUBMIT → INSERT/UPDATE en public.LemonwayConfig
    ↓
BD es la ÚNICA fuente de verdad de configuración
    ├─ NO usar process.env en endpoints
    ├─ Usar: getLemonwayConfigFromDB()
    ├─ Usar: getLemonwayApiToken()
    ├─ Usar: getLemonwayWalletId()
    └─ Usar: getLemonwayWebhookSecret()
    ↓
Cola y Webhooks leen config en tiempo real ✓
```

### Nuevo Helper: lemonway-config-manager.ts
```typescript
// Obtiene config completa desde BD
async function getLemonwayConfigFromDB(): Promise<LemonwayConfigData>

// Alias para tokens específicos
async function getLemonwayApiToken(): Promise<string>
async function getLemonwayWalletId(): Promise<string>
async function getLemonwayWebhookSecret(): Promise<string>
```

---

## 4. LÍMITES Y PROTECCIONES

### Rate Limiting
- De BD: `max_concurrent_requests`, `min_delay_between_requests_ms`
- Implementado en: LemonwayClient.processQueue()
- Ejemplo: máx 3 requests simultáeos, 1s entre requests

### Reintentos Exponenciales
- Configuración desde BD: `LemonwayRetryConfig`
- Backoff: 5s, 10s, 20s, 40s, 80s, ... máximo 300s
- Max 3 reintentos antes de fallar permanentemente

### Validación de Webhooks
- HMAC-SHA256 con webhook_secret de BD
- Signature en headers o body
- Rechaza si no coincide: 401 Unauthorized

### Permisos RBAC
- Solo admins pueden crear cuentas: `requireAdmin('lemonway', 'accounts:create')`
- Cada acción registrada en AccessLog automáticamente
- Dashboards admin-only para ver logs

---

## 5. ALERTAS Y MONITOREO

Tareas creadas automáticamente en casos de error:
```
- tipo: "lemonway_account_creation_failed"
  descripción: "Falló creación de cuenta en Lemonway (REQ-2025-001)"
  prioridad: HIGH

- tipo: "lemonway_kyc_rejected"
  descripción: "KYC rechazado para investor@example.com"
  prioridad: HIGH

- tipo: "lemonway_additional_info_required"
  descripción: "Se requiere información adicional para REQ-2025-001"
  prioridad: MEDIUM
```

Dashboard de Access Logs muestra:
- Intentos fallidos (deniedReason visible)
- Patrones de errores (muchos rechazos de IP = ataque?)
- Actividad sospechosa (muchos accesos denegados)

---

## 6. CHECKLIST DE IMPLEMENTACIÓN

- ✅ Helper centralizado: `lemonway-config-manager.ts`
- ✅ Webhook KYC: `/api/webhooks/lemonway/kyc-events` (actualizado)
- ✅ Cola FIFO Dual: `lemonway_request_queue` con auditoría
- ✅ Auditoría: AccessLog + UserAuditLog + Dashboard
- ✅ RBAC: `requireAdmin` con logging automático
- ✅ Validación de firmas: HMAC-SHA256
- ✅ Reintentos: Exponencial backoff
- ✅ Rate limiting: De BD, aplicado en queue processor
- ✅ Monitoreo: Access Logs dashboard + Alertas

---

## 7. ARCHIVOS CLAVE

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `lib/lemonway-config-manager.ts` | Helper centralizado de config | ✅ NUEVO |
| `app/api/webhooks/lemonway/kyc-events/route.ts` | Webhook KYC | ✅ ACTUALIZADO |
| `lib/auth/audit.ts` | Auditoría de accesos | ✅ EXISTENTE |
| `lib/audit.ts` | Auditoría de acciones | ✅ EXISTENTE |
| `app/api/admin/access-logs/route.ts` | API de logs | ✅ EXISTENTE |
| `app/dashboard/access-logs/page.tsx` | Dashboard de logs | ✅ EXISTENTE |
| `lib/lemonway-queue-processor.ts` | Procesador de cola | ✅ EXISTENTE |
| `public.LemonwayConfig` | BD de configuración | ✅ EXISTENTE |

---

**Status**: Integración Completa ✅
**Versión**: 1.0 Final
**Fecha**: 13 Enero 2025
