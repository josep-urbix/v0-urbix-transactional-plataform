# URBIX Integrations Platform - API Reference

**Fecha de creación:** 5 de enero de 2026  
**Última actualización:** 7 de enero de 2026, 16:00h

**Versión:** 1.0  
**Base URL:** `https://integrations.urbix.es`  
**Última actualización:** 5 Enero 2026

---

## Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [APIs de Administración](#apis-de-administración)
3. [APIs de Inversores](#apis-de-inversores)
4. [APIs de Lemonway](#apis-de-lemonway)
5. [APIs de Payment Accounts](#apis-de-payment-accounts)
6. [APIs de Workflows](#apis-de-workflows)
7. [APIs de Email](#apis-de-email)
8. [APIs de Usuarios y RBAC](#apis-de-usuarios-y-rbac)
9. [APIs de Cuentas Virtuales](#apis-de-cuentas-virtuales)
10. [APIs de Documentos y Firma Electrónica](#apis-de-documentos-y-firma-electrónica)
11. [Webhooks](#webhooks)
12. [APIs de Sistema](#apis-de-sistema)

---

## Autenticación

La plataforma utiliza **sesiones basadas en cookies HTTP-only** para autenticación. Todas las APIs requieren autenticación excepto las públicas (login, registro de inversores, webhooks).

### Middleware (Admin)

**Login**
```
POST /api/auth/login
Body: { email: string, password: string }
Response: { success: true, user: User }
```

**Google OAuth**
```
GET /api/auth/google
Response: Redirect a Google OAuth

POST /api/auth/google
Body: { code: string }
Response: { success: true, user: User }
```

**Logout**
```
POST /api/auth/logout
Response: { success: true }
```

**Check Session**
```
GET /api/auth/session
Response: { user: User } | { user: null }
```

**Forgot Password**
```
POST /api/auth/forgot-password
Body: { email: string }
Response: { success: true }
```

**Reset Password**
```
POST /api/auth/reset-password
Body: { token: string, password: string }
Response: { success: true }
```

### Portal de Inversores

**Registro**
```
POST /api/investors/auth/register
Body: { email: string, password: string, firstName: string, lastName: string }
Response: { success: true, userId: string }
```

**Login con Email/Password**
```
POST /api/investors/auth/session
Body: { email: string, password: string }
Response: { token: string, user: InvestorUser, requires2FA?: boolean }
```

**Google OAuth**
```
GET /api/investors/auth/google
Response: Redirect a Google OAuth

POST /api/investors/auth/google
Body: { code: string }
Response: { token: string, user: InvestorUser }
```

**Magic Link**
```
POST /api/investors/auth/magic-link
Body: { email: string }
Response: { success: true }

POST /api/investors/auth/magic-link/verify
Body: { token: string }
Response: { token: string, user: InvestorUser }
```

**2FA (Two Factor Authentication)**
```
POST /api/investors/auth/2fa/setup
Body: { password: string }
Response: { secret: string, qrCode: string }

POST /api/investors/auth/2fa/verify
Body: { code: string }
Response: { token: string, user: InvestorUser }

GET /api/investors/2fa/status
Response: { enabled: boolean }

POST /api/investors/auth/2fa/setup
Body: { password: string }
Response: { secret: string, qrCode: string }

POST /api/investors/auth/2fa/verify
Body: { code: string }
Response: { success: true }

DELETE /api/investors/2fa
Body: { password: string }
Response: { success: true }
```

**Verificación de Email**
```
POST /api/investors/auth/verify-email
Body: { token: string }
Response: { success: true }
```

**Sesión**
```
GET /api/investors/auth/session
Response: { user: InvestorUser, paymentAccount?: PaymentAccount }

DELETE /api/investors/auth/session
Response: { success: true }
```

**Cambiar a Password**
```
POST /api/investors/auth/switch-to-password
Body: { password: string }
Response: { success: true }
```

---

## APIs de Administración

### Admin - Inversores

**Listar Inversores**
```
GET /api/admin/investors
Query: ?search=string&status=string&page=number&limit=number
Response: { investors: Investor[], total: number, page: number, limit: number }
```

**Obtener Inversor**
```
GET /api/admin/investors/[id]
Response: { investor: Investor, sessions: Session[], wallets: Wallet[] }
```

**Actualizar Inversor**
```
PATCH /api/admin/investors/[id]
Body: Partial<Investor>
Response: { success: true, investor: Investor }
```

**Eliminar Inversor**
```
DELETE /api/admin/investors/[id]
Response: { success: true }
```

**Sesiones del Inversor**
```
GET /api/admin/investors/[id]/sessions
Response: { sessions: Session[] }

DELETE /api/admin/investors/[id]/sessions
Response: { success: true, deletedCount: number }
```

**Wallets del Inversor**
```
GET /api/admin/investors/[id]/wallets
Response: { wallets: Wallet[] }

POST /api/admin/investors/[id]/wallets
Body: { type: string, data: object }
Response: { success: true, wallet: Wallet }
```

**Estadísticas de Inversores**
```
GET /api/admin/investors/stats
Response: { 
  total: number, 
  active: number, 
  verified: number, 
  pending: number 
}
```

**Actividad de Inversores**
```
GET /api/admin/investors/activity
Query: ?limit=number&offset=number
Response: { activities: Activity[], total: number }
```

**Dispositivos de Inversores**
```
GET /api/admin/investors/devices
Response: { devices: Device[] }
```

**Todas las Sesiones**
```
GET /api/admin/investors/sessions
Query: ?status=active|expired
Response: { sessions: Session[] }

DELETE /api/admin/investors/sessions/[id]
Response: { success: true }
```

**Todos los Wallets**
```
GET /api/admin/investors/wallets
Query: ?investorId=string&status=string
Response: { wallets: Wallet[] }
```

**Configuración de Inversores**
```
GET /api/admin/investors/settings
Response: { settings: InvestorSettings }

POST /api/admin/investors/settings/general
Body: { registrationEnabled: boolean, emailVerificationRequired: boolean }
Response: { success: true }

POST /api/admin/investors/settings/google
Body: { clientId: string, clientSecret: string }
Response: { success: true }

POST /api/admin/investors/settings/google/test
Response: { valid: boolean, message: string }

POST /api/admin/investors/settings/apple
Body: { clientId: string, teamId: string, keyId: string, privateKey: string }
Response: { success: true }
```

### Admin - Lemonway Webhooks

**Listar Webhooks**
```
GET /api/admin/lemonway/webhooks
Query: ?status=string&eventType=string&page=number&limit=number
Response: { webhooks: Webhook[], total: number }
```

**Obtener Webhook**
```
GET /api/admin/lemonway/webhooks/[id]
Response: { webhook: Webhook }
```

**Eliminar Webhook**
```
DELETE /api/admin/lemonway/webhooks/[id]
Response: { success: true }
```

**Reprocesar Webhook**
```
POST /api/admin/lemonway/webhooks/[id]/reprocess
Response: { success: true, result: object }
```

**Estadísticas de Webhooks**
```
GET /api/admin/lemonway/webhooks/stats
Response: { 
  total: number, 
  byStatus: object, 
  byEventType: object 
}
```

### Admin - Configuración OAuth

**Obtener Configuración OAuth**
```
GET /api/admin/settings/oauth
Response: { 
  googleClientId: string, 
  allowedDomains: string[] 
}
```

**Actualizar Configuración OAuth**
```
POST /api/admin/settings/oauth
Body: { 
  googleClientId: string, 
  googleClientSecret: string, 
  allowedDomains: string[] 
}
Response: { success: true }
```

**Probar Conexión OAuth**
```
POST /api/admin/settings/oauth/test
Response: { valid: boolean, message: string }
```

### Admin - Migraciones

**Ejecutar Migración**
```
POST /api/admin/run-migration
Body: { scriptPath: string }
Response: { success: true, output: string }
```

**Listar Migraciones**
```
GET /api/admin/run-migration
Response: { scripts: string[] }
```

### Admin - Tipos de Documentos

**Listar Tipos de Documentos**
```
GET /api/admin/documents/types
Response: { types: DocumentType[] }
```

**Crear Tipo de Documento**
```
POST /api/admin/documents/types
Body: {
  name: string,
  display_name: string,
  description?: string,
  requiere_firma: boolean,
  obligatorio_antes_invertir?: boolean,
  dias_vigencia?: number
}
Response: { success: true, type: DocumentType }
```

**Actualizar Tipo de Documento**
```
PATCH /api/admin/documents/types/[id]
Body: Partial<DocumentType>
Response: { success: true }
```

**Eliminar Tipo de Documento**
```
DELETE /api/admin/documents/types/[id]
Response: { success: true }
```

### Admin - Versiones de Documentos

**Listar Versiones**
```
GET /api/admin/documents/versions
Query: ?typeId=UUID&status=string
Response: { versions: DocumentVersion[] }
```

**Crear Versión**
```
POST /api/admin/documents/versions
Body: {
  document_type_id: UUID,
  version_number: string,
  contenido: string,
  variables?: string[],
  notas_version?: string
}
Response: { success: true, version: DocumentVersion }
```

**Actualizar Versión**
```
PATCH /api/admin/documents/versions/[id]
Body: Partial<DocumentVersion>
Response: { success: true }
```

**Publicar Versión**
```
POST /api/admin/documents/versions/[id]/publish
Response: { success: true, version: DocumentVersion }
```

**Vista Previa con Inversor**
```
POST /api/admin/documents/versions/[id]/preview
Body: { investorEmail: string }
Response: { 
  contenidoRenderizado: string, 
  variables: object 
}
```

**Validar Variable**
```
POST /api/admin/documents/validate-variable
Body: { columnName: string }
Response: {
  valid: boolean,
  columnName?: string,
  dataType?: string,
  error?: string
}
```

### Admin - Sesiones de Firma

**Listar Sesiones de Firma**
```
GET /api/admin/documents/signatures
Query: ?status=string&investorId=UUID&page=number&limit=number
Response: { sessions: SignatureSession[], total: number }
```

**Obtener Sesión de Firma**
```
GET /api/admin/documents/signatures/[id]
Response: { session: SignatureSession }
```

**Crear Sesión de Testing**
```
POST /api/admin/documents/testing/create-session
Body: {
  documentVersionId: UUID,
  investorEmail: string
}
Response: {
  sessionId: UUID,
  token: string,
  link: string,
  expires_at: timestamp
}
```

---

## APIs de Inversores

### Cuenta del Inversor

**Obtener Payment Account**
```
GET /api/investors/payment-account
Response: { paymentAccount: PaymentAccount }
```

**Eliminar Cuenta**
```
DELETE /api/investors/account
Body: { password: string }
Response: { success: true }
```

### Investors - Firma de Documentos

**Obtener Datos de Sesión**
```
GET /api/investors/documents/sign/[token]
Response: {
  session: SignatureSession,
  document: DocumentVersion,
  investor: InvestorUser
}
```

**Vista Previa de Documento**
```
GET /api/investors/documents/sign/[token]/preview
Response: {
  contenidoRenderizado: string,
  variables: object
}
```

**Enviar Código OTP**
```
POST /api/investors/documents/sign/otp/send
Body: {
  sessionId: UUID,
  method: 'email' | 'sms',
  destination: string
}
Response: {
  sent: boolean,
  maskedDestination: string
}
```

**Verificar OTP y Completar Firma**
```
POST /api/investors/documents/sign/otp/verify
Body: {
  sessionId: UUID,
  otpCode: string,
  signatureDataUrl: string
}
Response: {
  success: boolean,
  signedDocumentId?: UUID,
  error?: string
}
```

**Listar Documentos del Inversor**
```
GET /api/investors/documents
Response: {
  pending: SignatureSession[],
  signed: SignedDocument[]
}
```

---

## APIs de Lemonway

### Configuración

**Obtener Configuración**
```
GET /api/lemonway/config
Response: { config: LemonwayConfig }
```

**Guardar Configuración**
```
POST /api/lemonway/config
Body: { 
  apiUrl: string, 
  login: string, 
  password: string, 
  walletEmail: string 
}
Response: { success: true }
```

**Probar Conexión**
```
POST /api/lemonway/test-connection
Response: { success: boolean, message: string }
```

**Probar API**
```
POST /api/lemonway/test-api
Body: { method: string, params: object }
Response: { success: boolean, data: object }
```

### Transacciones

**Listar Transacciones**
```
GET /api/lemonway/transactions
Query: ?status=string&type=string&page=number&limit=number
Response: { transactions: Transaction[], total: number }
```

**Sincronizar Transacciones**
```
POST /api/lemonway/sync-transactions
Body: { startDate?: string, endDate?: string }
Response: { success: true, synced: number }
```

**Debug Transaction**
```
GET /api/lemonway/debug-transaction
Query: ?transactionId=string
Response: { transaction: Transaction, logs: Log[] }
```

**Eliminar Transacciones**
```
POST /api/lemonway/delete-transactions
Body: { transactionIds: string[] }
Response: { success: true, deleted: number }
```

### Field Mappings

**Listar Mappings**
```
GET /api/lemonway/field-mappings
Response: { mappings: FieldMapping[] }
```

**Crear Mapping**
```
POST /api/lemonway/field-mappings
Body: { 
  lemonwayField: string, 
  dbField: string, 
  transformer?: string 
}
Response: { success: true, mapping: FieldMapping }
```

**Actualizar Mapping**
```
PUT /api/lemonway/field-mappings
Body: { id: number, ...updates }
Response: { success: true }
```

**Eliminar Mapping**
```
DELETE /api/lemonway/field-mappings
Query: ?id=number
Response: { success: true }
```

### Queue & Retry

**Retry Queue**
```
GET /api/lemonway/retry-queue
Response: { queue: QueueItem[] }

POST /api/lemonway/retry-queue
Response: { success: true, processed: number }
```

**Retry Manual**
```
POST /api/lemonway/retry-manual
Body: { transactionId: string }
Response: { success: true }
```

**Requeue Pending**
```
POST /api/lemonway/requeue-pending
Response: { success: true, requeued: number }
```

**Queue Stats**
```
GET /api/lemonway/queue-stats
Response: { 
  pending: number, 
  processing: number, 
  failed: number 
}
```

**Retry History**
```
GET /api/lemonway/retry-history
Query: ?transactionId=string&page=number&limit=number
Response: { history: RetryHistory[], total: number }
```

**Mark Orphan Failed**
```
GET /api/lemonway/mark-orphan-failed
Response: { orphans: Transaction[] }

POST /api/lemonway/mark-orphan-failed
Body: { transactionIds: string[] }
Response: { success: true, marked: number }
```

### API Calls

**Listar API Calls**
```
GET /api/lemonway/api-calls
Query: ?status=string&method=string&page=number
Response: { apiCalls: ApiCall[], total: number }
```

**Poll API Calls**
```
GET /api/lemonway/api-calls/poll
Response: { calls: ApiCall[] }
```

### Otros

**Status**
```
GET /api/lemonway/status
Response: { 
  connected: boolean, 
  lastSync: string, 
  stats: object 
}
```

**DB Schema**
```
GET /api/lemonway/db-schema
Response: { tables: Table[] }
```

---

## APIs de Payment Accounts

**Listar Cuentas**
```
GET /api/payment-accounts
Query: ?search=string&status=string&page=number&limit=number
Response: { accounts: PaymentAccount[], total: number }
```

**Crear Cuenta**
```
POST /api/payment-accounts
Body: { 
  email: string, 
  firstName: string, 
  lastName: string,
  ...otherFields 
}
Response: { success: true, account: PaymentAccount }
```

**Obtener Cuenta**
```
GET /api/payment-accounts/[accountId]
Response: { account: PaymentAccount }
```

**Actualizar Cuenta**
```
PATCH /api/payment-accounts/[accountId]
Body: Partial<PaymentAccount>
Response: { success: true, account: PaymentAccount }
```

**Sincronizar Cuentas**
```
POST /api/payment-accounts/sync
Body: { force?: boolean }
Response: { success: true, synced: number }
```

**Sincronizar por ID**
```
POST /api/payment-accounts/sync-by-id
Body: { accountId: string }
Response: { success: true, account: PaymentAccount }
```

**Sincronizar Rango**
```
POST /api/payment-accounts/sync-range
Body: { startId: number, endId: number }
Response: { success: true, synced: number }

POST /api/payment-accounts/sync-range-direct
Body: { startId: number, endId: number }
Response: { success: true, synced: number }
```

**Estado de Sincronización**
```
GET /api/payment-accounts/sync-status/[jobId]
Response: { status: string, progress: number }
```

**Test Sync**
```
GET /api/payment-accounts/test-sync
Response: { success: boolean, data: object }
```

**Test Insert**
```
POST /api/payment-accounts/test-insert
Body: { accountData: object }
Response: { success: true, accountId: string }
```

**Sync Account 153 (Específico)**
```
GET /api/payment-accounts/sync-account-153
Response: { account: PaymentAccount }

POST /api/payment-accounts/sync-account-153
Response: { success: true, account: PaymentAccount }
```

---

## APIs de Workflows

### Workflows

**Listar Workflows**
```
GET /api/workflows
Query: ?status=string&eventName=string&page=number&limit=number
Response: { workflows: Workflow[], total: number }
```

**Crear Workflow**
```
POST /api/workflows
Body: { 
  name: string, 
  description?: string,
  eventName: string,
  actions: Action[]
}
Response: { success: true, workflow: Workflow }
```

**Obtener Workflow**
```
GET /api/workflows/[id]
Response: { workflow: Workflow }
```

**Actualizar Workflow**
```
PUT /api/workflows/[id]
Body: Partial<Workflow>
Response: { success: true, workflow: Workflow }
```

**Eliminar Workflow**
```
DELETE /api/workflows/[id]
Response: { success: true }
```

**Activar Workflow**
```
POST /api/workflows/[id]/activate
Response: { success: true }
```

**Desactivar Workflow**
```
POST /api/workflows/[id]/deactivate
Response: { success: true }
```

**Clonar Workflow**
```
POST /api/workflows/[id]/clone
Body: { name: string }
Response: { success: true, workflow: Workflow }
```

### Workflow Runs

**Listar Ejecuciones**
```
GET /api/workflows/[id]/runs
Query: ?status=string&page=number&limit=number
Response: { runs: WorkflowRun[], total: number }
```

**Obtener Ejecución**
```
GET /api/workflows/[id]/runs/[runId]
Response: { run: WorkflowRun, steps: WorkflowStep[] }
```

**Eliminar Ejecución**
```
DELETE /api/workflows/[id]/runs/[runId]
Response: { success: true }
```

**Todas las Ejecuciones**
```
GET /api/workflows/runs
Query: ?status=string&workflowId=string&page=number
Response: { runs: WorkflowRun[], total: number }
```

### Eventos

**Listar Eventos**
```
GET /api/workflows/events
Response: { events: WorkflowEvent[] }
```

**Crear Evento**
```
POST /api/workflows/events
Body: { 
  name: string, 
  description?: string 
}
Response: { success: true, event: WorkflowEvent }
```

**Emitir Evento**
```
POST /api/workflows/emit
Body: { 
  eventName: string, 
  payload: object 
}
Response: { 
  success: true, 
  triggeredWorkflows: number,
  runs: WorkflowRun[]
}
```

---

## APIs de Email

### Configuración

**Obtener Configuración**
```
GET /api/emails/config
Response: { config: EmailConfig }
```

**Actualizar Configuración**
```
PUT /api/emails/config
Body: { 
  smtpHost: string, 
  smtpPort: number,
  smtpUser: string,
  smtpPassword: string,
  fromEmail: string,
  fromName: string
}
Response: { success: true }
```

### Templates

**Listar Templates**
```
GET /api/emails/templates
Query: ?category=string&search=string
Response: { templates: EmailTemplate[] }
```

**Crear Template**
```
POST /api/emails/templates
Body: { 
  name: string, 
  subject: string,
  htmlBody: string,
  textBody?: string,
  category?: string
}
Response: { success: true, template: EmailTemplate }
```

**Obtener Template**
```
GET /api/emails/templates/[id]
Response: { template: EmailTemplate }
```

**Actualizar Template**
```
PUT /api/emails/templates/[id]
Body: Partial<EmailTemplate>
Response: { success: true }
```

**Eliminar Template**
```
DELETE /api/emails/templates/[id]
Response: { success: true }
```

### Envío

**Enviar Email**
```
POST /api/emails/send
Body: { 
  to: string | string[], 
  subject: string,
  html?: string,
  text?: string,
  templateId?: string,
  variables?: object
}
Response: { success: true, messageId: string }
```

**Listar Envíos**
```
GET /api/emails/sends
Query: ?status=string&to=string&page=number&limit=number
Response: { sends: EmailSend[], total: number }
```

**Obtener Envío**
```
GET /api/emails/sends/[id]
Response: { send: EmailSend }
```

### Tracking

**Track Open**
```
GET /api/emails/track/[id]
Response: 1x1 transparent GIF
```

**Track Click**
```
GET /api/emails/click/[id]
Query: ?url=string
Response: Redirect to URL
```

### Test

**Test Email**
```
POST /api/emails/test
Body: { to: string }
Response: { success: true }
```

---

## APIs de Usuarios y RBAC

### Usuarios

**Listar Usuarios**
```
GET /api/users
Query: ?search=string&role=string&page=number
Response: { users: User[], total: number }
```

**Crear Usuario**
```
POST /api/users
Body: { 
  email: string, 
  password: string,
  name: string,
  roleId?: number
}
Response: { success: true, user: User }
```

**Obtener Usuario**
```
GET /api/users/[id]
Response: { user: User }
```

**Actualizar Usuario**
```
PATCH /api/users/[id]
Body: Partial<User>
Response: { success: true }
```

**Eliminar Usuario**
```
DELETE /api/users/[id]
Response: { success: true }
```

**Cambiar Password**
```
POST /api/users/change-password
Body: { 
  currentPassword: string, 
  newPassword: string 
}
Response: { success: true }
```

### Roles

**Listar Roles**
```
GET /api/roles
Response: { roles: Role[] }
```

**Crear Rol**
```
POST /api/roles
Body: { 
  name: string, 
  description?: string,
  permissions: number[]
}
Response: { success: true, role: Role }
```

**Eliminar Rol**
```
DELETE /api/roles
Query: ?id=number
Response: { success: true }
```

### Permisos

**Listar Permisos**
```
GET /api/permissions
Response: { permissions: Permission[] }
```

**Crear Permiso**
```
POST /api/permissions
Body: { 
  name: string, 
  description?: string,
  resource: string,
  action: string
}
Response: { success: true, permission: Permission }
```

**Eliminar Permiso**
```
DELETE /api/permissions
Query: ?id=number
Response: { success: true }
```

---

## APIs de Cuentas Virtuales

### Cuentas

**Listar Cuentas Virtuales**
```
GET /api/admin/virtual-accounts/accounts
Query: ?search=string&status=string&page=number&limit=number
Response: { accounts: VirtualAccount[], total: number }
```

**Obtener Cuenta Virtual**
```
GET /api/admin/virtual-accounts/accounts/[accountId]
Response: { account: VirtualAccount }
```

**Actualizar Cuenta Virtual**
```
PATCH /api/admin/virtual-accounts/accounts/[accountId]
Body: { status?: string, metadata?: object }
Response: { success: true, account: VirtualAccount }
```

### Movimientos

**Listar Movimientos**
```
GET /api/admin/virtual-accounts/accounts/[accountId]/movements
Query: ?startDate=string&endDate=string&page=number&limit=number
Response: { movements: Movement[], total: number, balance: number }
```

### Tipos de Operación

**Listar Tipos de Operación**
```
GET /api/admin/virtual-accounts/operation-types
Response: { operationTypes: OperationType[] }
```

**Crear Tipo de Operación**
```
POST /api/admin/virtual-accounts/operation-types
Body: { 
  code: string, 
  name: string,
  type: 'CREDIT' | 'DEBIT',
  description?: string
}
Response: { success: true, operationType: OperationType }
```

---

## Webhooks

### Lemonway Webhook

**Recibir Webhook**
```
POST /api/webhooks/lemonway
Headers: { 'Content-Type': 'application/json' }
Body: { 
  NotifCategory: number,
  TransactionId?: string,
  WalletId?: string,
  ...otherFields
}
Response: { success: true }
```

**Test Webhook**
```
GET /api/webhooks/lemonway/test
Response: { success: true, message: string }

POST /api/webhooks/lemonway/test
Body: { notifCategory: number, data: object }
Response: { success: true }
```

### HubSpot Webhook

**Recibir Webhook de Meetings**
```
POST /api/hubspot/meetings/webhook
Headers: { 'X-HubSpot-Signature': string }
Body: HubSpot Event
Response: { success: true }

GET /api/hubspot/meetings/webhook
Response: { message: "HubSpot webhook endpoint" }
```

---

## APIs de Sistema

### Dashboard Stats

**Estadísticas del Dashboard**
```
GET /api/dashboard/stats
Response: { 
  users: number,
  transactions: number,
  paymentAccounts: number,
  workflows: number,
  ...otherStats
}
```

### Configuración

**HubSpot Token**
```
GET /api/settings/hubspot-token
Response: { token: string }

PUT /api/settings/hubspot-token
Body: { token: string }
Response: { success: true }
```

**Webhook API Key**
```
GET /api/settings/webhook-api-key
Response: { apiKey: string }

PUT /api/settings/webhook-api-key
Body: { apiKey: string }
Response: { success: true }
```

### SQL Logs

**Listar SQL Logs**
```
GET /api/sql-logs
Query: ?operation=string&status=string&page=number&limit=number
Response: { logs: SQLLog[], total: number }
```

### Sistema

**Versión**
```
GET /api/system/version
Response: { version: string, buildDate: string }
```

**IP Actual**
```
GET /api/system/ip
Response: { ip: string }
```

**Historial de IPs**
```
GET /api/system/ip/history
Response: { ips: IPHistory[] }

POST /api/system/ip/history
Body: { ip: string, description?: string }
Response: { success: true }
```

### Transacciones

**Listar Transacciones**
```
GET /api/transactions
Query: ?status=string&type=string&page=number&limit=number
Response: { transactions: Transaction[], total: number }
```

**Obtener Transacción**
```
GET /api/transactions/[id]
Response: { transaction: Transaction }
```

### Sesión

**Check Session**
```
GET /api/session
Response: { user: User } | { user: null }
```

### Cron Jobs

**Listar Cron Jobs**
```
GET /api/cron-jobs
Response: { jobs: CronJob[] }
```

**Actualizar Cron Job**
```
PUT /api/cron-jobs
Body: { id: number, enabled: boolean, schedule?: string }
Response: { success: true }
```

**Ejecuciones del Cron**
```
GET /api/cron-jobs/[id]/executions
Query: ?page=number&limit=number
Response: { executions: CronExecution[], total: number }
```

**Retry Queue (Cron)**
```
GET /api/cron/retry-queue
Response: { queue: QueueItem[] }
```

### App Config

**Lemonway Retry Config**
```
GET /api/app-config/lemonway-retry
Response: { config: RetryConfig }

POST /api/app-config/lemonway-retry
Body: { 
  maxRetries: number,
  retryDelaySeconds: number,
  enableAutoRetry: boolean
}
Response: { success: true }
```

### Debug (Desarrollo)

```
GET /api/debug/check-api-logs
GET /api/debug/list-accounts
POST /api/debug/run-migration
GET /api/debug/test-full-sync
```

---

## Notas de Implementación

### Paginación
La mayoría de endpoints que devuelven listas soportan paginación con query params:
- `page`: Número de página (default: 1)
- `limit`: Items por página (default: 20, max: 100)

### Filtros
Los endpoints de listado soportan filtros comunes:
- `search`: Búsqueda por texto
- `status`: Filtrar por estado
- `startDate` / `endDate`: Rango de fechas

### Respuestas de Error
Formato estándar:
```json
{
  "error": "Mensaje de error descriptivo",
  "code": "ERROR_CODE",
  "details": {}
}
```

Códigos HTTP comunes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

### Rate Limiting
Actualmente no hay rate limiting implementado. Se recomienda implementar para producción.

### Webhooks Security
- **Lemonway**: Validar IP origin y/o usar API key
- **HubSpot**: Validar signature con `X-HubSpot-Signature` header

---

**Fin del documento**
