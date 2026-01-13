# ARQUITECTURA COMPLETA URBIX - PARTE 3

## 6. SISTEMA DE SEGURIDAD Y RBAC

### 6.1 Autenticación Multi-Layer

**Capa 1: Credenciales**
```typescript
// Login workflow
1. POST /api/auth/login { email, password }
2. Hash password con bcrypt
3. Comparar con BD: SELECT password_hash FROM public.User
4. Si coincide:
   a. Create Session (sessionToken + refreshToken)
   b. Set HTTP-only cookie
   c. Generar AccessLog (allowed=true)
5. Si no coincide:
   a. Incrementar LoginAttempt.failure_count
   b. Si > 5 intentos: bloquear cuenta 1 hora
   c. Generar AccessLog (allowed=false, reason="Invalid credentials")
```

**Capa 2: 2FA (TOTP)**
```typescript
// Setup 2FA
1. POST /api/auth/2fa/setup
2. Generar secret TOTP con speakeasy
3. Return QR code
4. Usuario escanea con Google Authenticator/Authy
5. Usuario envía código
6. Verificar código: speakeasy.totp.verify(secret, token)
7. Si válido: Update public.User (totp_secret, totp_enabled)

// Login con 2FA
1. POST /api/auth/login { email, password }
2. Verificar password ✓
3. Si totp_enabled:
   a. Return { requiresMFA: true, tempToken }
   b. POST /api/auth/2fa/verify { tempToken, code }
   c. Verificar TOTP
   d. Si válido: create Session real
```

**Capa 3: Session Management**
```typescript
// Session token
sessionToken = crypto.randomBytes(32).toString('hex')
refreshToken = crypto.randomBytes(32).toString('hex')

// Storage
public.Session {
  sessionToken (short-lived, 24h)
  refreshToken (long-lived, 30d)
  device_fingerprint (para detección de fraude)
  last_activity
}

// Refresh workflow
1. Session expira
2. Frontend envía refreshToken
3. POST /api/auth/refresh { refreshToken }
4. Validar que refreshToken existe y es válido
5. Generar nuevo sessionToken
6. Return nuevo token
```

### 6.2 RBAC (Role-Based Access Control)

**Jerarquía de Roles**
```
SUPERADMIN (1)
├─ Permiso: * (acceso total)
├─ RolePermissions: [todos los recursos]
└─ No puede ser removido

ADMIN (N)
├─ Permisos: investors:*, tasks:*, virtual-accounts:*, lemonway:*
├─ No puede: cambiar settings críticos, ver otros admins
└─ Típicamente: Gerentes de URBIX

MANAGER (N)
├─ Permisos: investors:read, tasks:*, virtual-accounts:read
├─ No puede: cambiar estado KYC, crear cuentas
└─ Típicamente: Supervisores

USER (N)
├─ Permisos: (ninguno por defecto)
└─ Puede: ver su propio perfil

INVESTOR (N) - Portal público
├─ Permisos: investors:profile, documents:sign
└─ Solo acceso a datos propios
```

**Verificación de Permisos**
```typescript
// En cada endpoint
const user = await requireAdmin(session, "resource:action", request)

// Función requireAdmin()
async function requireAdmin(session, permission, request) {
  // 1. Verificar sesión válida
  if (!session?.user?.id) throw new AuthError()
  
  // 2. Obtener usuario de BD
  const user = await sql.query("SELECT * FROM public.User WHERE id = $1", [session.user.id])
  if (!user) throw new AuthError()
  
  // 3. Verificar si es SuperAdmin
  if (user.role === 'superadmin') {
    logAllowedAccess(...) // log
    return user
  }
  
  // 4. Verificar permiso específico en cache (5 min)
  const cached = await cache.get(`permission:${user.id}:${permission}`)
  if (cached) {
    if (cached.allowed) return user
    else throw ForbiddenError()
  }
  
  // 5. Consultar BD si no en cache
  const [resource, action] = permission.split(':')
  const has_permission = await sql.query(`
    SELECT rp.permission_id FROM public.RolePermission rp
    JOIN public.Role r ON r.id = rp.role_id
    JOIN public.Permission p ON p.id = rp.permission_id
    WHERE r.name = $1 AND p.resource = $2 AND p.action = $3
  `, [user.role, resource, action])
  
  // 6. Cache resultado (5 min)
  await cache.set(`permission:${user.id}:${permission}`, {
    allowed: !!has_permission,
    expires_at: now + 5min
  })
  
  // 7. Log resultado
  if (has_permission) {
    logAllowedAccess(user, permission, request)
    return user
  } else {
    logDeniedAccess(user, permission, "No tiene permiso", request)
    throw ForbiddenError()
  }
}
```

### 6.3 Auditoría Completa

**AccessLog** - Todos los accesos
```sql
SELECT * FROM public.AccessLog
WHERE timestamp > NOW() - INTERVAL '7 days'
  AND (allowed = false OR resource LIKE '%:delete%')
ORDER BY timestamp DESC
```

**UserAuditLog** - Cambios de datos críticos
```sql
-- Ejemplo: cambio de rol
SELECT * FROM public.UserAuditLog
WHERE tabla_afectada = 'User'
  AND campo_cambiado = 'role'
  AND timestamp > NOW() - INTERVAL '30 days'
```

**SQLLog** - Queries ejecutadas (en producción, deshabilitado)
```sql
SELECT * FROM public.SQLLog
WHERE query LIKE '%DELETE%' OR query LIKE '%DROP%'
ORDER BY timestamp DESC
```

---

## 7. INTEGRACIONES CON APIS EXTERNAS

### 7.1 Lemonway Integration

**Configuración**
```typescript
// lib/lemonway/config.ts
const config = {
  api_url: 'https://api-sandbox.lemonway.fr/rest/v1/json',
  wallet_id: process.env.LEMONWAY_WALLET_ID,
  api_token: process.env.LEMONWAY_API_TOKEN,
  timeout: 30000,
  max_retries: 5,
  retry_delays: [1000, 2000, 4000, 8000, 16000] // exponencial
}
```

**Operaciones Críticas**
```typescript
// GetWallets - Obtener datos del wallet
GET /api/lemonway/GetWallets
├─ Input: wallet_id
├─ Respuesta: { id, name, balance, status }
├─ Storage: cache 5 min
└─ Retry: sí, log en LemonwayApiCallRetryHistory

// GetWalletTransactions - Obtener movimientos
GET /api/lemonway/GetWalletTransactions
├─ Input: wallet_id, date_from, date_to
├─ Respuesta: [{id, amount, date, type, label}]
├─ Storage: import en lemonway_temp.movimientos_cuenta
├─ Trigger: crear Tasks de aprobación
└─ Retry: sí, exponencial

// UpdateWalletDetails
PUT /api/lemonway/UpdateWalletDetails
├─ Input: wallet_id, { name, beneficiary_info }
├─ Respuesta: { success, wallet_id }
└─ Log: LemonwayApiCallLog (siempre)

// GetBalance - Obtener saldo
GET /api/lemonway/GetBalance
├─ Input: wallet_id
├─ Respuesta: { available, blocked, total }
├─ Cache: 1 min
└─ Usado por: dashboard inversores
```

**Retry Logic**
```typescript
// Si falla una llamada a Lemonway:
1. Registrar en LemonwayApiCallLog (error_message)
2. Esperar delay[retry_count] ms
3. Reintentar hasta 5 veces
4. Si sigue fallando:
   a. Registrar en LemonwayApiCallRetryHistory
   b. Notificar admin por email
   c. Crear Task: "ERROR_LEMONWAY_API"
   d. Manual retry disponible desde admin
```

### 7.2 HubSpot Integration

**Sync de Contactos**
```typescript
// POST /api/hubspot/sync-contacts
1. Obtener todos inversores de BD
2. For each investor:
   a. Buscar existente en HubSpot
   b. Si no existe: create contact
   c. Si existe: update con datos nuevos
   d. Mapeo: name → firstname+lastname, email → email
3. Log en HubSpotSyncLog
4. Enviar reporte a admin
```

**Webhook: Meetings Updated**
```typescript
// POST /api/hubspot/meetings/webhook
1. Signature verification (HubSpot secret)
2. Parse: { contact_id, meeting_date, meeting_link }
3. Buscar inversor en BD por HubSpot contact_id
4. Si es meeting de inversión:
   a. Create Task: "SEGUIMIENTO_REUNION"
   b. Guardar Google Meet link en contexto
   c. Trigger workflow: investment.meeting_scheduled
5. Log en WebhookLog
```

### 7.3 Stripe Integration

**Payment Intent**
```typescript
// POST /api/stripe/payment-intent
1. Input: { investment_id, amount_cents }
2. Create payment intent: stripe.paymentIntents.create()
3. Response: { client_secret, payment_intent_id }
4. Storage: payment_intent_id en inversiones.inversion.stripe_pi_id
5. Return clientSecret al frontend
```

**Webhook: payment_intent.succeeded**
```typescript
// POST /api/webhooks/stripe
1. Signature verification (Stripe secret)
2. Parse payment_intent
3. Buscar inversión: WHERE stripe_pi_id = ?
4. Update inversiones.inversion:
   a. estado = CONFIRMADA
   b. fecha_confirmacion = now
5. Create inversiones.inversion_status_history
6. Trigger: investment.confirmed
7. Workflow: crear virtual account
```

### 7.4 Email Service (SMTP)

**Configuración**
```typescript
// Stored in emails.email_config table
{
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  from_email: string
  from_name: string
}
```

**Sending Workflow**
```typescript
// POST /api/emails/send
1. Obtener template de emails.email_templates
2. Reemplazar variables: {{ investor_name }}, {{ amount }}
3. Create transport: nodemailer.createTransport(config)
4. Send email
5. Store en emails.email_sends: { recipient, template, status }
6. Si falla: retry 3 veces con delay exponencial
7. Log en emails.email_sends con error_message
```

**Templates Disponibles**
- BIENVENIDA_INVERSOR
- KYC_ENVIADO
- KYC_APROBADO
- FIRMA_DOCUMENTOS
- INVERSION_CONFIRMADA
- MOVIMIENTO_BLOQUEADO
- TASK_ASIGNADA

---

## 8. CRON JOBS Y AUTOMATIZACIÓN

### 8.1 Procesos Automáticos

**Cada 5 minutos**
```typescript
POST /api/cron/process-lemonway-imports (con CRON_SECRET)
1. Obtener fecha de último import
2. For each virtual account:
   a. GET /api/lemonway/GetWalletTransactions
   b. Filter solo nuevas transacciones
   c. Insert en lemonway_temp.movimientos_cuenta
   d. Estado: PENDIENTE_REVISION
3. For each new movement:
   a. Create Task: APROBACION_MOVIMIENTO
   b. Asignar al manager correspondiente
4. Log duración en CronJobExecution
```

**Cada 10 minutos**
```typescript
POST /api/cron/process-approved-movements
1. Query movimientos con estado_revision = APROBADO
2. For each:
   a. Update virtual_accounts.cuentas_virtuales (saldo)
   b. Insert en virtual_accounts.movimientos_cuenta
   c. Update estado_revision = APLICADO
3. If new movement:
   a. Create notification para inversor
   b. Send email
4. Log en CronJobExecution
```

**Cada 30 minutos**
```typescript
POST /api/cron/check-task-sla
1. Query tareas con fecha_vencimiento próximo
2. For each:
   a. Si vencimiento < 1 hora: escalate a level 1
   b. Si vencimiento < NOW: escalate a level 2
   c. Create task_escalations record
3. Send email a escalators
4. Update task estado = ESCALADA
```

**Cada día a las 00:00**
```typescript
POST /api/cron/daily-reports
1. Generar reporte de inversiones del día
2. Generar reporte de tareas completadas
3. Generar reporte de movimientos
4. Send a admin por email
```

---

## 9. MONITOREO Y ALERTAS

### 9.1 Métricas Clave

```typescript
// Dashboard de monitoreo
{
  "api_health": {
    "total_requests_24h": 15243,
    "error_rate": "0.23%",
    "avg_response_time_ms": 245,
    "p95_response_time_ms": 1203,
    "p99_response_time_ms": 3204
  },
  "lemonway_api": {
    "successful_calls": 1340,
    "failed_calls": 3,
    "retry_rate": "0.22%",
    "avg_call_duration_ms": 1203
  },
  "cron_jobs": {
    "process_lemonway_imports": {
      "last_run": "2026-01-12T20:30:00Z",
      "duration_ms": 3421,
      "status": "SUCCESS",
      "movements_imported": 42
    },
    "process_approved_movements": {
      "last_run": "2026-01-12T20:40:00Z",
      "duration_ms": 1203,
      "status": "SUCCESS",
      "movements_applied": 12
    }
  },
  "database": {
    "active_connections": 23,
    "avg_query_time_ms": 87,
    "slow_queries_24h": 12,
    "replication_lag_ms": 0
  }
}
```

### 9.2 Alertas Automáticas

- **Task SLA Próximo a Vencerse** → Email a asignado + supervisor
- **Lemonway API Failure** → Retry automático + email si persiste
- **Cron Job Failed** → Email inmediato a DevOps
- **Database Connection Pool Critical** → Email a DBA
- **High Error Rate (> 1%)** → Slack alert
- **Payment Processing Stuck** → Email a Finance
- **KYC Document Upload Failed** → Retry + Task creada

---

## 10. VARIABLES DE ENTORNO REQUERIDAS

```bash
# DATABASE
DATABASE_URL=postgresql://user:pass@host/dbname
POSTGRES_URL=postgresql://user:pass@host/dbname
POSTGRES_URL_NON_POOLING=postgresql://user:pass@host/dbname

# NextAuth
NEXTAUTH_SECRET=<random-secret-min-32-chars>
NEXTAUTH_URL=https://urbix.app

# OAuth Google
GOOGLE_CLIENT_ID=<from-google-cloud>
GOOGLE_CLIENT_SECRET=<from-google-cloud>
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=<private-key-json>

# Lemonway
LEMONWAY_API_TOKEN=<api-token>
LEMONWAY_WALLET_ID=<wallet-id>
LEMONWAY_ENVIRONMENT=sandbox|production

# HubSpot
HUBSPOT_ACCESS_TOKEN=<access-token>
HUBSPOT_WEBHOOK_SECRET=<webhook-secret>

# Stripe
STRIPE_SECRET_KEY=<secret-key>
STRIPE_PUBLISHABLE_KEY=<publishable-key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<publishable-key>

# Email SMTP
SMTP_HOST=<smtp-host>
SMTP_PORT=<smtp-port>
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
SMTP_FROM_EMAIL=noreply@urbix.es
SMTP_FROM_NAME="URBIX"

# File Storage
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>

# Admin
ADMIN_PASSWORD=<secure-password>
ALLOWED_EMAIL_DOMAINS=urbix.es,urbix.com

# Security
CRON_SECRET=<random-cron-secret>
WEBHOOK_DEBUG_MODE=false

# App
NEXT_PUBLIC_APP_URL=https://urbix.app
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
```

---

**Documento completo. v1.0 - Enero 2026**
**Consúltalo como referencia única de verdad para toda la arquitectura de URBIX.**
