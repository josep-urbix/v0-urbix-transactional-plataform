## 3. ENTIDADES DE DATOS PRINCIPALES (continuación)

### 3.3 Esquema Virtual Accounts (Cuentas Virtuales)

```sql
virtual_accounts.cuentas_virtuales
  ├─ id (UUID, PK)
  ├─ inversion_id (UUID, FK inversiones.inversion)
  ├─ investor_user_id (UUID, FK investors.User)
  ├─ lemonway_wallet_id (string)
  ├─ numero_cuenta (string, unique)
  ├─ estado (ACTIVA | BLOQUEADA | CERRADA)
  ├─ saldo_total (decimal)
  ├─ saldo_disponible (decimal)
  ├─ saldo_bloqueado (decimal)
  ├─ created_at (timestamp)
  ├─ updated_at (timestamp)
  └─ closed_at (timestamp, nullable)

virtual_accounts.movimientos_cuenta
  ├─ id (UUID, PK)
  ├─ cuenta_id (UUID, FK cuentas_virtuales)
  ├─ tipo_movimiento (DEPOSITO | RETIRO | TRANSFERENCIA | INTERES)
  ├─ monto (decimal)
  ├─ saldo_anterior (decimal)
  ├─ saldo_posterior (decimal)
  ├─ referencia (string)
  ├─ descripcion (text)
  ├─ created_at (timestamp)
  └─ processed_at (timestamp)
```

### 3.4 Esquema Tasks (Gestión de Tareas)

```sql
tasks.process_templates
  ├─ id (UUID)
  ├─ nombre (string) -- "Verificación KYC", "Aprobación Movimiento"
  ├─ descripcion_template (text)
  ├─ enum_value (string, unique) -- "REVISION_KYC", "APROBACION_MOVIMIENTO"
  ├─ tipo_default (string)
  └─ created_at (timestamp)

tasks.tasks
  ├─ id (UUID, PK)
  ├─ tipo (enum) -- CUENTA_BLOQUEADA, DEPOSITO_PENDIENTE, etc
  ├─ proceso (string) -- "REVISION_KYC", "APROBACION_MOVIMIENTO"
  ├─ prioridad (BAJA | MEDIA | ALTA | CRITICA)
  ├─ titulo (string)
  ├─ descripcion (text)
  ├─ estado (PENDIENTE | ASIGNADA | EN_PROGRESO | ESCALADA | COMPLETADA)
  ├─ cuenta_virtual_id (UUID, FK, nullable)
  ├─ payment_account_id (UUID, FK, nullable)
  ├─ contexto (jsonb) -- Datos contextuales
  ├─ fecha_vencimiento (timestamp)
  ├─ asignado_a (UUID, FK public.User, nullable)
  ├─ creado_por (string, email del admin)
  ├─ fecha_creacion (timestamp)
  ├─ fecha_completada (timestamp, nullable)
  ├─ resultado (jsonb, nullable) -- {success, mensaje, datos}
  └─ updated_at (timestamp)

tasks.task_comments
  ├─ id (UUID, PK)
  ├─ task_id (UUID, FK tasks)
  ├─ user_id (UUID, FK public.User)
  ├─ texto (text)
  ├─ created_at (timestamp)
  └─ updated_at (timestamp)

tasks.task_audit
  ├─ id (UUID, PK)
  ├─ task_id (UUID, FK tasks)
  ├─ accion (CREATED | UPDATED | ASSIGNED | COMPLETED | ESCALATED)
  ├─ usuario_id (UUID, FK public.User, nullable)
  ├─ campo_cambiado (string, nullable)
  ├─ valor_anterior (string, nullable)
  ├─ valor_nuevo (string, nullable)
  ├─ timestamp (timestamp)
  └─ ip_address (string, nullable)

tasks.task_escalations
  ├─ id (UUID, PK)
  ├─ task_id (UUID, FK tasks)
  ├─ nivel_escalacion (1 | 2 | 3)
  ├─ escalado_a (UUID, FK public.User)
  ├─ razon (string)
  ├─ created_at (timestamp)
  └─ resuelta_at (timestamp, nullable)

tasks.sla_config
  ├─ id (UUID)
  ├─ proceso_id (UUID, FK process_templates)
  ├─ prioridad (string)
  ├─ tiempo_sla_horas (integer)
  ├─ tiempo_warning_horas (integer)
  ├─ escalation_level_1 (UUID, FK public.User)
  ├─ escalation_level_2 (UUID, FK public.User, nullable)
  ├─ escalation_level_3 (UUID, FK public.User, nullable)
  ├─ created_at (timestamp)
  └─ updated_at (timestamp)
```

### 3.5 Esquema Inversiones

```sql
inversiones.inversion
  ├─ id (UUID, PK)
  ├─ investor_id (UUID, FK investors.User)
  ├─ proyecto_id (string) -- Referencia externa
  ├─ monto_inversion (decimal)
  ├─ porcentaje_participacion (decimal)
  ├─ estado (PENDIENTE | CONFIRMADA | COMPLETADA | CANCELADA)
  ├─ fecha_creacion (timestamp)
  ├─ fecha_confirmacion (timestamp, nullable)
  ├─ fecha_completada (timestamp, nullable)
  └─ observaciones (text, nullable)

inversiones.inversion_status_history
  ├─ id (UUID, PK)
  ├─ inversion_id (UUID, FK inversion)
  ├─ estado_anterior (string)
  ├─ estado_nuevo (string)
  ├─ razon_cambio (string, nullable)
  ├─ timestamp (timestamp)
  └─ changed_by (UUID, FK public.User)
```

### 3.6 Esquema Documentos (Firma Digital)

```sql
documentos.document_template
  ├─ id (UUID)
  ├─ nombre (string)
  ├─ tipo (CONTRATO | ACUERDO | REPORTE)
  ├─ contenido_template (text)
  └─ created_at (timestamp)

documentos.signature_session
  ├─ id (UUID, PK)
  ├─ document_id (UUID, FK document_template)
  ├─ investor_id (UUID, FK investors.User)
  ├─ inversion_id (UUID, FK inversiones.inversion)
  ├─ estado (PENDIENTE | OTP_ENVIADO | OTP_VERIFICADO | FIRMADO)
  ├─ otp_token (string)
  ├─ otp_expira_at (timestamp)
  ├─ otp_intentos (integer)
  ├─ ip_address (string)
  ├─ device_fingerprint (string)
  ├─ created_at (timestamp)
  ├─ otp_verified_at (timestamp, nullable)
  └─ signed_at (timestamp, nullable)

documentos.signed_document
  ├─ id (UUID, PK)
  ├─ signature_session_id (UUID, FK signature_session)
  ├─ content_hash (string) -- SHA256
  ├─ pdf_url (string) -- Vercel Blob
  ├─ signature_metadata (jsonb) -- Fecha, hora, IP, device
  ├─ signed_at (timestamp)
  └─ archivado_at (timestamp, nullable)
```

### 3.7 Esquema Lemonway (Importación de Movimientos)

```sql
lemonway_temp.movimientos_cuenta
  ├─ id (UUID, PK)
  ├─ lemonway_transaction_id (string, unique)
  ├─ wallet_id (string)
  ├─ amount (decimal)
  ├─ currency (string)
  ├─ type (string) -- CREDIT, DEBIT
  ├─ label (text)
  ├─ comment (text, nullable)
  ├─ transaction_date (timestamp)
  ├─ estado_revision (PENDIENTE | APROBADO | RECHAZADO)
  ├─ revisado_por (UUID, FK public.User, nullable)
  ├─ motivo_rechazo (text, nullable)
  ├─ reviewed_at (timestamp, nullable)
  ├─ imported_at (timestamp)
  └─ aplicado_at (timestamp, nullable)

public.LemonwayApiCallLog
  ├─ id (UUID)
  ├─ endpoint (string)
  ├─ request_params (jsonb)
  ├─ response (jsonb)
  ├─ http_status (integer)
  ├─ error_message (text, nullable)
  ├─ duration_ms (integer)
  ├─ llamado_por (UUID, FK public.User)
  └─ created_at (timestamp)
```

### 3.8 Esquema Workflows (Motor de Procesos)

```sql
workflows.workflow_definition
  ├─ id (UUID)
  ├─ nombre (string)
  ├─ tipo (INVERSION | KYC | PAGOS)
  ├─ pasos (jsonb) -- [{id, tipo, config, next_step}]
  ├─ active (boolean)
  ├─ created_at (timestamp)
  └─ updated_at (timestamp)

workflows.workflow_run
  ├─ id (UUID, PK)
  ├─ workflow_id (UUID, FK workflow_definition)
  ├─ trigger_entity_id (string) -- ID de la inversión, usuario, etc
  ├─ estado (INICIADO | EN_PROGRESO | COMPLETADO | ERROR)
  ├─ paso_actual (string)
  ├─ contexto (jsonb) -- Datos del flujo
  ├─ created_at (timestamp)
  ├─ completed_at (timestamp, nullable)
  └─ error_message (text, nullable)

workflows.workflow_execution_log
  ├─ id (UUID)
  ├─ workflow_run_id (UUID, FK workflow_run)
  ├─ paso (string)
  ├─ accion (string)
  ├─ resultado (jsonb)
  ├─ timestamp (timestamp)
  └─ duration_ms (integer)
```

---

## 4. ENDPOINTS DE API CRÍTICOS

### 4.1 Autenticación

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login con email/password |
| `/api/auth/register` | POST | Registro de usuario admin |
| `/api/auth/logout` | POST | Logout |
| `/api/auth/session` | GET | Obtener sesión actual |
| `/api/auth/2fa/setup` | POST | Iniciar setup de 2FA |
| `/api/auth/2fa/verify` | POST | Verificar código 2FA |
| `/api/investors/auth/register` | POST | Registro de inversor (público) |
| `/api/investors/auth/magic-link` | POST | Magic link login |

### 4.2 Gestión de Inversores (Admin)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/investors` | GET | Listar inversores |
| `/api/admin/investors/[id]` | GET | Obtener inversor |
| `/api/admin/investors/[id]` | PUT | Actualizar inversor |
| `/api/admin/investors/kyc/[id]` | GET | Obtener documentos KYC |
| `/api/admin/investors/kyc/[id]/approve` | POST | Aprobar KYC |
| `/api/admin/investors/kyc/[id]/reject` | POST | Rechazar KYC |
| `/api/admin/investors/wallets` | GET | Listar wallets vinculados |
| `/api/admin/investors/settings` | GET | Obtener configuración OAuth |

### 4.3 Gestión de Tareas

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/tasks` | GET/POST | Listar/crear tareas |
| `/api/admin/tasks/[id]` | GET | Obtener tarea |
| `/api/admin/tasks/[id]` | PUT | Actualizar tarea |
| `/api/admin/tasks/[id]/assign` | POST | Asignar tarea |
| `/api/admin/tasks/[id]/complete` | POST | Completar tarea |
| `/api/admin/tasks/[id]/escalate` | POST | Escalar tarea |
| `/api/admin/tasks/[id]/comments` | GET/POST | Comentarios |
| `/api/admin/tasks/sla-config` | GET | Configuración de SLAs |

### 4.4 Gestión de Cuentas Virtuales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/virtual-accounts/accounts` | GET | Listar cuentas |
| `/api/admin/virtual-accounts/[id]` | GET | Obtener detalle cuenta |
| `/api/admin/virtual-accounts/[id]/movements` | GET | Movimientos |
| `/api/admin/virtual-accounts/[id]/block` | POST | Bloquear cuenta |
| `/api/admin/virtual-accounts/[id]/unblock` | POST | Desbloquear cuenta |

### 4.5 Lemonway Integration

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/lemonway/movements` | GET | Movimientos importados |
| `/api/admin/lemonway/movements/[id]/review` | POST | Revisar movimiento |
| `/api/cron/process-lemonway-imports` | POST | Cron: importar movimientos |
| `/api/cron/process-approved-movements` | POST | Cron: aplicar movimientos |
| `/api/lemonway/GetWalletTransactions` | POST | Obtener transacciones |
| `/api/webhooks/lemonway` | POST | Webhook Lemonway |

### 4.6 Inversiones (Investor Portal)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/investors/projects` | GET | Listar proyectos |
| `/api/investors/investments` | GET | Mis inversiones |
| `/api/investors/investments` | POST | Crear inversión |
| `/api/investors/investments/[id]` | GET | Detalle inversión |
| `/api/investors/documents/pending` | GET | Documentos por firmar |
| `/api/investors/documents/sign/start` | POST | Iniciar firma |
| `/api/investors/documents/sign/otp/send` | POST | Enviar OTP |
| `/api/investors/documents/sign/otp/verify` | POST | Verificar OTP |
| `/api/investors/documents/sign/complete` | POST | Completar firma |

---

## 5. FLUJOS DE NEGOCIO COMPLETOS

### 5.1 Inversión End-to-End

```
PASO 1: Registro Inversor (Portal Público)
├─ POST /api/investors/auth/register
├─ Create investors.User (estado=REGISTRO_INCOMPLETO)
├─ Send welcome email
└─ Trigger workflow: investor.registered

PASO 2: Verificación de Email
├─ Investor recibe link de confirmación
├─ POST /api/investors/auth/verify-email
├─ Update investors.User (estado=REGISTRO_COMPLETO)
└─ Trigger: investor.email_verified

PASO 3: KYC (Inversor Sube Documentos)
├─ GET /api/investors/kyc/status
├─ POST /api/investors/kyc/upload
├─ Create investors.KycDocument
├─ Upload a Vercel Blob
└─ Create Task: VERIFICACION_KYC (asignado a admin)

PASO 4: Revisión KYC (Admin)
├─ GET /api/admin/investors/kyc/[id]
├─ Admin revisa documentos
├─ POST /api/admin/investors/kyc/[id]/approve
├─ Update investors.User (kyc_status=VERIFICADO)
├─ Create inversiones.Task: INVERSION_DISPONIBLE
└─ Trigger: investor.kyc_verified

PASO 5: Vinculación de Wallet (Inversor)
├─ POST /api/investors/wallets/link
├─ Enviar código de verificación
├─ Inversor verifica en Lemonway
├─ Create investors.WalletLinked
└─ Trigger: wallet.linked

PASO 6: Seleccionar Proyecto (Inversor)
├─ GET /api/investors/projects (listar disponibles)
├─ POST /api/investors/investments (crear inversión)
├─ Create inversiones.inversion (estado=PENDIENTE)
├─ Create Task: FIRMA_DOCUMENTOS
└─ Trigger: investment.created

PASO 7: Firma de Documentos (Inversor)
├─ GET /api/investors/documents/pending
├─ POST /api/investors/documents/sign/start
├─ Create documentos.signature_session
├─ Enviar OTP por SMS/Email
├─ POST /api/investors/documents/sign/otp/verify
├─ Inversor firma digitalmente
├─ Create documentos.signed_document
├─ Generar PDF en Vercel Blob
└─ Trigger: document.signed

PASO 8: Pago (Stripe/Sistema)
├─ GET /api/stripe/payment-intent
├─ Inversor completa pago en Stripe
├─ Webhook: POST /api/webhooks/stripe/payment-confirmed
├─ Update inversiones.inversion (estado=CONFIRMADA)
├─ Create inversiones.inversion_status_history
└─ Trigger: investment.confirmed

PASO 9: Crear Cuenta Virtual (Cron)
├─ POST /api/cron/create-virtual-accounts
├─ Create virtual_accounts.cuentas_virtuales
├─ Call Lemonway: CreateWallet
├─ Create Task: CUENTA_CREADA
└─ Trigger: virtualaccount.created

PASO 10: Importar Movimientos (Cron cada 5 min)
├─ POST /api/cron/process-lemonway-imports
├─ GET /api/lemonway/GetWalletTransactions
├─ Insert en lemonway_temp.movimientos_cuenta
├─ Create Task: APROBACION_MOVIMIENTO
└─ Status: PENDIENTE_REVISION

PASO 11: Revisar Movimientos (Admin)
├─ GET /api/admin/lemonway/movements
├─ Admin revisa cada movimiento
├─ POST /api/admin/lemonway/movements/[id]/review
├─ Update estado_revision=APROBADO
└─ Trigger: movement.reviewed

PASO 12: Aplicar Movimientos (Cron cada 10 min)
├─ POST /api/cron/process-approved-movements
├─ For each APROBADO movement:
├─ Update virtual_accounts.cuentas_virtuales (saldo)
├─ Insert en virtual_accounts.movimientos_cuenta
├─ Create notification para inversor
└─ Trigger: movement.applied

PASO 13: Notificación a Inversor
├─ Email con resumen de inversión
├─ Dashboard muestra saldo y movimientos
└─ Inversor puede ver historial completo
```

---

**Documento Parte 2. Continúa en ARQUITECTURA-COMPLETA-PARTE3.md**
