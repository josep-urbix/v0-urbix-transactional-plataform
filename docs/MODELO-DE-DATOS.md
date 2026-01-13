# Modelo de Datos - URBIX Integrations Platform

**Fecha de creación:** 5 de enero de 2026  
**Última actualización:** 7 de enero de 2026, 16:00h

**Versión:** 1.0  
**Fecha:** Enero 2026  
**Base de Datos:** PostgreSQL (Neon)

---

## 📋 Índice

1. [Arquitectura General](#arquitectura-general)
2. [Schemas](#schemas)
3. [Tablas por Schema](#tablas-por-schema)
4. [Relaciones entre Entidades](#relaciones-entre-entidades)
5. [Diagramas](#diagramas)
6. [Índices y Optimización](#índices-y-optimización)

---

## 🏗️ Arquitectura General

La base de datos está organizada en **12 schemas principales**:

- **`public`** - Administración general, usuarios middleware, RBAC, SMS, configuración
- **`payments`** - Gestión de cuentas de pago y mapeos Lemonway
- **`investors`** - Portal de inversores, autenticación, sesiones, devices
- **`workflows`** - Motor de workflows y automatizaciones
- **`emails`** - Sistema de plantillas y envíos de email
- **`lemonway_webhooks`** - Gestión de webhooks de Lemonway
- **`virtual_accounts`** - Cuentas virtuales y contabilidad doble partida
- **`lemonway`** - Datos estructurados de Lemonway API v2
- **`documentos`** - Sistema de gestión de documentos y firma electrónica
- **`proyectos`** - Gestión de proyectos de inversión
- **`inversiones`** - Gestión de inversiones de los inversores en proyectos
- **`tasks`** - Sistema de tareas con SLA, escalamiento y particionado mensual

---

## 📊 Schemas

### Schema: `public`

**Propósito:** Core del middleware - usuarios administradores, configuración, logs, RBAC, SMS

**Tablas:**
- `User` - Usuarios administradores del middleware
- `Role` - Roles del sistema (superadmin, admin, user)
- `Permission` - Permisos granulares (users.read, config.write, etc.)
- `RolePermission` - Asignación de permisos a roles
- `AccessLog` - Auditoría completa de accesos permitidos y denegados (NUEVO)
- `UserAuditLog` - Auditoría de cambios de usuarios
- `PasswordResetToken` - Tokens para reseteo de contraseña
- `AdminSettings` - Configuración OAuth del middleware
- `AppConfig` - Configuración general de la app
- `SQLLog` - Logs de todas las consultas SQL ejecutadas
- `CronJob` - Configuración de tareas programadas
- `CronJobExecution` - Historial de ejecuciones de cron jobs
- `Transaction` - Transacciones generales del sistema
- `LemonwayConfig` - Configuración de conexión a Lemonway API
- `LemonwayApiCallLog` - Logs de llamadas a Lemonway API
- `LemonwayApiCallRetryHistory` - Historial de reintentos de llamadas fallidas
- `LemonwayTransaction` - Transacciones con Lemonway
- `LemonwayWallet` - Wallets de Lemonway
- `sms_api_config` - Configuración de servicios SMS (Twilio, etc.)
- `sms_templates` - Plantillas de mensajes SMS
- `sms_logs` - Registro de envíos de SMS

---

### Schema: `payments`

**Propósito:** Gestión de cuentas de pago y mapeos de campos Lemonway

**Tablas:**
- `payment_accounts` - Cuentas de pago (wallets) sincronizadas
- `lemonway_field_mappings` - Mapeo de campos Lemonway a modelo interno

**Campos principales de `payment_accounts`:**
\`\`\`sql
- id: integer (PK)
- account_id: varchar (ID externo)
- internal_id: integer (ID interno Lemonway)
- account_type: varchar (individual/company)
- status: varchar (1-6, estados Lemonway)
- kyc_status: varchar (estado verificación)
- balance: numeric (saldo actual)
- email: varchar
- first_name, last_name: varchar
- company_name: varchar
- birth_date: date
- nationality, country: varchar
- address, city, postal_code: text/varchar
- phone_number, mobile_number: varchar
- metadata: jsonb
- raw_data: jsonb (respuesta completa Lemonway)
- last_sync_at: timestamp
\`\`\`

---

### Schema: `investors`

**Propósito:** Portal de inversores - autenticación, sesiones, KYC, devices

**Tablas:**
- `User` - Usuarios inversores
- `Session` - Sesiones activas con tokens
- `Device` - Dispositivos conocidos/confiables
- `MagicLink` - Enlaces mágicos para login sin contraseña
- `WalletLink` - Vinculación usuario-wallet Lemonway
- `LoginAttempt` - Intentos de login (exitosos/fallidos)
- `ActivityLog` - Registro de actividad de inversores
- `Notification` - Notificaciones para inversores
- `Settings` - Configuración OAuth Google para inversores

**Campos principales de `investors.User`:**
\`\`\`sql
- id: uuid (PK)
- email: varchar (unique)
- password_hash: varchar
- first_name, last_name: varchar
- display_name: text
- avatar_url: text
- phone: varchar
- status: varchar (active/suspended/blocked/pending)
- email_verified: boolean
- email_verified_at: timestamp
- kyc_status: varchar
- kyc_submitted_at, kyc_verified_at: timestamp
- google_id, apple_id: varchar (OAuth)
- two_factor_enabled: boolean
- two_factor_method, two_factor_secret: varchar
- last_login_at: timestamp
- created_at, updated_at, deleted_at: timestamp
\`\`\`

**Campos principales de `investors.Session`:**
\`\`\`sql
- id: uuid (PK)
- user_id: uuid (FK → investors.User)
- token: varchar
- token_hash: varchar (hashed)
- refresh_token: varchar
- refresh_token_hash: varchar (hashed)
- expires_at: timestamp
- ip_address: varchar
- user_agent: text
- device_info: jsonb
- is_active: boolean
- last_activity_at: timestamp
- created_at: timestamp
\`\`\`

**Vista materializada:**
- `user_stats` - Estadísticas agregadas de usuarios

---

### Schema: `workflows`

**Propósito:** Motor de workflows visuales para automatización

**Tablas:**
- `Workflow` - Definiciones de workflows
- `WorkflowTrigger` - Disparadores (eventos que inician workflows)
- `WorkflowStep` - Pasos individuales del workflow
- `WorkflowRun` - Ejecuciones de workflows
- `WorkflowStepRun` - Ejecución de cada paso
- `WorkflowEvent` - Catálogo de eventos disponibles

**Estructura de `Workflow`:**
\`\`\`sql
- id: uuid (PK)
- name: varchar
- description: text
- status: varchar (active/inactive/draft)
- version: integer
- entry_step_key: varchar (primer paso)
- canvas_data: jsonb (posición visual de nodos)
- created_at, updated_at: timestamp
\`\`\`

**Estructura de `WorkflowStep`:**
\`\`\`sql
- id: uuid (PK)
- workflow_id: uuid (FK → Workflow)
- step_key: varchar (identificador único en el workflow)
- name: varchar
- type: varchar (http_request/wait/condition/transform)
- config: jsonb (configuración específica del tipo)
- position_x, position_y: integer (coordenadas canvas)
- next_step_on_success: varchar
- next_step_on_error: varchar
- max_retries: integer
- retry_delay_ms: integer
- retry_backoff_multiplier: numeric
\`\`\`

**Estructura de `WorkflowRun`:**
\`\`\`sql
- id: uuid (PK)
- workflow_id: uuid (FK → Workflow)
- trigger_event_name: varchar
- trigger_payload: jsonb (datos del evento disparador)
- status: varchar (running/completed/failed/paused)
- current_step_key: varchar
- context: jsonb (variables compartidas entre pasos)
- started_at, finished_at, resume_at: timestamp
- error_message, error_stack: text
\`\`\`

---

### Schema: `emails`

**Propósito:** Sistema de plantillas y envío de emails

**Tablas:**
- `email_templates` - Plantillas de email con variables
- `email_sends` - Registro de emails enviados
- `email_config` - Configuración SMTP/Gmail

**Estructura de `email_templates`:**
\`\`\`sql
- id: integer (PK)
- slug: varchar (unique, identificador)
- name: varchar
- description: text
- subject: varchar
- body_html, body_text: text
- from_name, from_email: varchar
- reply_to: varchar
- variables: jsonb (lista de variables usadas)
- is_active: boolean
- created_by, updated_by: varchar
- created_at, updated_at: timestamp
\`\`\`

**Estructura de `email_sends`:**
\`\`\`sql
- id: integer (PK)
- template_id: integer (FK → email_templates)
- template_slug: varchar
- to_email, to_name: varchar
- from_email, from_name: varchar
- subject: varchar
- body_html, body_text: text
- variables_used: jsonb
- status: varchar (queued/sent/delivered/opened/clicked/failed)
- sent_at, opened_at, clicked_at: timestamp
- open_count, click_count: integer
- gmail_message_id, gmail_thread_id: varchar
- error_code, error_message: text
- ip_address, user_agent: text
- metadata: jsonb
- created_by: varchar
- created_at: timestamp
\`\`\`

---

### Schema: `lemonway_webhooks`

**Propósito:** Gestión de webhooks recibidos de Lemonway

**Tablas:**
- `WebhookDelivery` - Webhooks recibidos
- `NotifCategoryMapping` - Mapeo de NotifCategory a tipos de evento
- `PaymentMethodCode` - Códigos de métodos de pago
- `BlockingReasonCode` - Códigos de razones de bloqueo

**ENUM Types:**
\`\`\`sql
- event_type: KYC_UPDATE, MONEY_IN_WIRE, MONEY_IN_CARD, MONEY_OUT, 
  WALLET_STATUS_CHANGE, IBAN_CHANGE, DOCUMENT_UPLOADED, etc.
- processing_status: pending, processing, processed, failed
\`\`\`

**Estructura de `WebhookDelivery`:**
\`\`\`sql
- id: uuid (PK)
- notif_category: integer (código Lemonway)
- event_type: event_type (enum)
- wallet_int_id: varchar (ID interno wallet)
- wallet_ext_id: varchar (ID externo wallet)
- transaction_id: varchar
- amount: numeric
- raw_payload: jsonb (payload completo)
- raw_headers: jsonb (headers HTTP)
- processing_status: processing_status (enum)
- status_code: integer (200, 400, 500...)
- error_message: text
- retry_count: integer
- received_at: timestamp (cuándo llegó)
- processed_at: timestamp (cuándo se procesó)
- created_at, updated_at: timestamp
\`\`\`

**Vista materializada:**
- `WebhookStats` - Estadísticas de webhooks

---

### Schema: `virtual_accounts` (NUEVO)

**Propósito:** Sistema de cuentas virtuales con contabilidad doble partida

**Tablas:**
- `cuentas_virtuales` - Cuentas virtuales de clientes
- `tipos_operacion_contable` - Tipos de operaciones contables
- `movimientos_cuenta` - Movimientos/transacciones de cuentas

**Estructura de `cuentas_virtuales`:**
\`\`\`sql
- id: uuid (PK)
- nombre_cuenta: varchar
- saldo_actual: numeric (default 0.00)
- estado: varchar (activa/bloqueada/cerrada)
- user_id: uuid (FK opcional → investors.User)
- lemonway_wallet_id: varchar (FK opcional → lemonway.wallets)
- metadatos: jsonb
- fecha_creacion, fecha_actualizacion: timestamp
\`\`\`

**Estructura de `tipos_operacion_contable`:**
\`\`\`sql
- id: integer (PK)
- codigo: varchar (unique, ej: DEPOSIT, WITHDRAWAL)
- nombre: varchar
- descripcion: text
- tipo_movimiento: varchar (CREDITO/DEBITO)
- activo: boolean
- color_ui: varchar (para UI)
- icono_ui: varchar (para UI)
- orden_display: integer
- metadatos: jsonb
- created_at, updated_at: timestamp
\`\`\`

**Estructura de `movimientos_cuenta`:**
\`\`\`sql
- id: uuid (PK)
- cuenta_virtual_id: uuid (FK → cuentas_virtuales)
- tipo_operacion_id: integer (FK → tipos_operacion_contable)
- monto: numeric (siempre positivo)
- tipo_movimiento: varchar (CREDITO/DEBITO)
- saldo_previo: numeric (balance antes del movimiento)
- saldo_posterior: numeric (balance después del movimiento)
- descripcion: text
- referencia_externa: varchar (ID transacción externa)
- lemonway_transaction_id: varchar (FK → lemonway.transactions)
- metadatos: jsonb
- fecha_operacion: timestamp
- procesado_por: varchar (user que procesó)
- created_at: timestamp
\`\`\`

---

### Schema: `lemonway`

**Propósito:** Datos estructurados de Lemonway API v2

**Tablas:**
- `wallets` - Wallets de Lemonway (espejo estructurado)
- `wallet_status_history` - Historial de cambios de estado
- `transactions` - Transacciones de Lemonway
- `documents` - Documentos KYC subidos
- `payment_methods` - Métodos de pago configurados
- `status_codes` - Catálogo de códigos de estado

**Estructura de `lemonway.wallets`:**
\`\`\`sql
- id: uuid (PK)
- lemonway_id: varchar (unique, ID interno Lemonway)
- external_id: varchar (unique, ID externo)
- email: varchar
- wallet_type: varchar (individual/company)
- status: integer (1-6)
- kyc_level: integer
- balance: numeric
- iban: varchar
- bic: varchar
- first_name, last_name: varchar
- company_name: varchar
- birth_date: date
- nationality: varchar
- address: jsonb
- documents: jsonb
- metadata: jsonb
- last_synced_at: timestamp
- created_at, updated_at: timestamp
\`\`\`

**Estructura de `lemonway.transactions`:**
\`\`\`sql
- id: uuid (PK)
- lemonway_transaction_id: varchar (unique)
- wallet_id: uuid (FK → lemonway.wallets)
- type: varchar (MONEY_IN/MONEY_OUT/TRANSFER)
- amount: numeric
- currency: varchar
- status: varchar
- debit_wallet_id, credit_wallet_id: varchar
- payment_method: varchar
- external_reference: varchar
- description: text
- metadata: jsonb
- executed_at: timestamp
- created_at, updated_at: timestamp
\`\`\`

---

### Schema: `documentos` (NUEVO)

**Propósito:** Sistema de gestión de documentos y firma electrónica

**Tablas:**
- `document_type` - Tipos de documentos (contratos, mandatos)
- `document_version` - Versiones de documentos con control de estado
- `signature_session` - Sesiones de firma únicas por inversor
- `signed_document` - Documentos firmados con metadatos
- `signature_verification` - CSV de verificación de firmas

**ENUM Types:**
\`\`\`sql
- firma_channel: desktop, mobile, qr_mobile
\`\`\`

**Estructura de `document_type`:**
\`\`\`sql
- id: uuid (PK)
- name: varchar (unique, código identificador)
- display_name: varchar (nombre visible)
- description: text
- requiere_firma: boolean
- obligatorio_antes_invertir: boolean
- dias_vigencia: integer
- created_by, created_at, updated_at: varchar/timestamp
\`\`\`

**Estructura de `document_version`:**
\`\`\`sql
- id: uuid (PK)
- document_type_id: uuid (FK → document_type)
- version_number: varchar
- contenido: text (HTML del documento)
- variables: text[] (variables usadas)
- notas_version: text
- status: varchar (borrador/publicado)
- publicado_en, publicado_por: timestamp/varchar
- created_by, created_at, updated_at: varchar/timestamp
\`\`\`

**Estructura de `signature_session`:**
\`\`\`sql
- id: uuid (PK)
- inversor_id: uuid (FK → investors.User)
- document_version_id: uuid (FK → document_version)
- status: varchar (pendiente/firmado/expirado/cancelado)
- token_firma: varchar (token único para enlace)
- qr_token: varchar (token para QR móvil)
- expires_at, qr_token_expires_at: timestamp
- canal_origen: firma_channel
- ip_firma, user_agent: varchar/text
- otp_code, otp_expires_at, otp_attempts: varchar/timestamp/integer
- firmado_en, created_at, updated_at: timestamp
\`\`\`

**Estructura de `signed_document`:**
\`\`\`sql
- id: uuid (PK)
- signature_session_id: uuid (FK → signature_session)
- inversor_id: uuid (FK → investors.User)
- document_version_id: uuid (FK → document_version)
- contenido_firmado: text (HTML renderizado)
- firma_manuscrita_url: text (URL Vercel Blob)
- metodo_firma: varchar (otp_email/otp_sms)
- ip_firma, user_agent: varchar/text
- firma_valida: boolean
- fecha_firma, fecha_expiracion: timestamp
- created_at: timestamp
\`\`\`

**Estructura de `signature_verification`:**
\`\`\`sql
- id: uuid (PK)
- signed_document_id: uuid (FK → signed_document)
- verificacion_csv: text
- created_at: timestamp
\`\`\`

---

### Schema: `proyectos` (NUEVO)

**Propósito:** Gestión de proyectos de inversión

**Tablas:**
- `proyecto` - Proyectos de inversión
- `proyecto_update` - Actualizaciones/novedades de proyectos

**Estructura de `proyecto`:**
\`\`\`sql
- id: uuid (PK)
- nombre: varchar
- descripcion: text
- estado: varchar (borrador/activo/financiado/completado/cancelado)
- objetivo_financiacion: numeric
- monto_recaudado: numeric
- fecha_inicio, fecha_fin: timestamp
- tasa_retorno: numeric
- plazo_meses: integer
- metadatos: jsonb
- created_at, updated_at: timestamp
\`\`\`

**Estructura de `proyecto_update`:**
\`\`\`sql
- id: uuid (PK)
- proyecto_id: uuid (FK → proyecto)
- titulo: varchar
- contenido: text
- tipo: varchar (noticia/hito/financiero)
- publicado: boolean
- fecha_publicacion: timestamp
- created_by: varchar
- created_at: timestamp
\`\`\`

---

### Schema: `inversiones` (NUEVO)

**Propósito:** Gestión de inversiones de los inversores en proyectos

**Tablas:**
- `inversion` - Inversiones realizadas
- `inversion_status_history` - Historial de cambios de estado

**Estructura de `inversion`:**
\`\`\`sql
- id: uuid (PK)
- inversor_id: uuid (FK → investors.User)
- proyecto_id: uuid (FK → proyectos.proyecto)
- monto: numeric
- estado: varchar (pendiente/confirmada/cancelada/reembolsada)
- fecha_inversion: timestamp
- metadatos: jsonb
- created_at, updated_at: timestamp
\`\`\`

**Estructura de `inversion_status_history`:**
\`\`\`sql
- id: uuid (PK)
- inversion_id: uuid (FK → inversion)
- estado_anterior: varchar
- estado_nuevo: varchar
- motivo: text
- cambiado_por: varchar
- changed_at: timestamp
\`\`\`

---

### Schema: `tasks` (NUEVO)

**Propósito:** Sistema de gestión de tareas con SLA, escalamiento y particionado mensual

**Tablas:**
- `tasks` - Tabla principal de tareas (particionada por mes)
- `tasks_YYYY_MM` - Particiones mensuales (ej: tasks_2026_01)
- `task_templates` - Plantillas de tareas reutilizables
- `task_comments` - Comentarios en tareas
- `task_audit` - Auditoría de cambios en tareas
- `task_sla_config` - Configuración de SLAs
- `task_escalations` - Reglas de escalamiento automático

**Estructura de `tasks`:**
\`\`\`sql
- id: uuid (PK)
- title: varchar
- description: text
- status: varchar (todo/in_progress/blocked/done/cancelled)
- priority: varchar (low/medium/high/urgent)
- assigned_to: varchar
- created_by: varchar
- tipo_tarea: varchar
- lemonway_wallet_id, hubspot_deal_id: varchar (referencias externas)
- due_date: timestamp
- sla_breach_at: timestamp
- escalated: boolean
- escalated_at, escalated_to: timestamp/varchar
- tags: text[]
- metadatos: jsonb
- created_at, updated_at, completed_at: timestamp
\`\`\`

**Particionado:**
- Una partición por mes para optimizar queries
- Retención: 24 meses (configurable)
- Auto-creación de particiones futuras vía trigger

---

## 🔗 Relaciones entre Entidades

### Relaciones Principales

\`\`\`
public.User (Admin)
  ├─→ public.UserAuditLog (1:N) - cambios del usuario
  ├─→ public.AccessLog (1:N) - auditoría de accesos (NUEVO)
  └─→ public.Role (N:1) → public.RolePermission (1:N) → public.Permission (N:1)

investors.User (Inversor)
  ├─→ investors.Session (1:N) - sesiones activas
  ├─→ investors.Device (1:N) - dispositivos conocidos
  ├─→ investors.LoginAttempt (1:N) - intentos de login
  ├─→ investors.ActivityLog (1:N) - actividad
  ├─→ investors.Notification (1:N) - notificaciones
  ├─→ investors.WalletLink (1:N) - wallets vinculados
  ├─→ virtual_accounts.cuentas_virtuales (1:N) - cuentas virtuales
  ├─→ inversiones.inversion (1:N) - inversiones realizadas (NUEVO)
  └─→ documentos.signature_session (1:N) - sesiones de firma

proyectos.proyecto
  ├─→ proyectos.proyecto_update (1:N) - actualizaciones
  └─→ inversiones.inversion (1:N) - inversiones en el proyecto

inversiones.inversion
  ├─→ investors.User (N:1) - inversor
  ├─→ proyectos.proyecto (N:1) - proyecto
  └─→ inversiones.inversion_status_history (1:N) - historial cambios

tasks.tasks
  ├─→ tasks.task_comments (1:N) - comentarios
  ├─→ tasks.task_audit (1:N) - auditoría
  ├─→ tasks.task_templates (N:1 opcional) - template origen
  ├─→ lemonway.wallets (N:1 opcional) - wallet relacionado
  └─→ tasks.task_escalations (1:N) - escalamientos
\`\`\`

---

## 📈 Diagramas

### Diagrama de Alto Nivel

\`\`\`
┌─────────────────┐
│  public schema  │ ← Middleware Admin + RBAC + SMS
│   (Admin Core)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │   RBAC  │ + AccessLog (auditoría)
    └─────────┘

┌──────────────────┐
│ investors schema │ ← Portal Inversores
│  (User Auth/KYC) │
└────────┬─────────┘
         │
    ┌────┴──────────┐
    │  WalletLink   │
    └────┬──────────┘
         │
┌────────┴────────────────┐
│   payments.payment_     │ ← Cuentas Pago
│      accounts           │   (Lemonway Sync)
└────────┬────────────────┘
         │
    ┌────┴────────────┐
    │ lemonway.wallets│ ← Datos estructurados
    └────┬────────────┘
         │
┌────────┴─────────────────┐
│ virtual_accounts.cuentas_│ ← Contabilidad
│       virtuales          │   Virtual
└──────────────────────────┘

┌──────────────────────────┐
│  workflows schema        │ ← Automatización
│  (Motor Workflows)       │
└──────────────────────────┘

┌──────────────────────────┐
│  emails schema           │ ← Comunicación
│  (Templates/Sends)       │
└──────────────────────────┘

┌──────────────────────────┐
│ lemonway_webhooks schema │ ← Eventos Lemonway
│  (Webhook Management)    │
└──────────────────────────┘

┌──────────────────────────┐
│ documentos schema        │ ← Gestión de Documentos
│  (Document Management)   │   y Firma Electrónica
└────────┬─────────────────┘
         │
    ┌────┴────┐
    │ inversor│
    │proyecto │
    └─────────┘

┌──────────────────────────┐
│ proyectos schema         │ ← Proyectos de Inversión
│  (Investment Projects)   │
└────────┬─────────────────┘
         │
    ┌────┴────┐
    │ inversion│
    └─────────┘

┌──────────────────────────┐
│ inversiones schema       │ ← Inversiones
│  (Investments)           │
└────────┬─────────────────┘
         │
    ┌────┴────┐
    │ inversor│
    │proyecto │
    └─────────┘

┌──────────────────────────┐
│ tasks schema             │ ← Sistema de Tareas
│  (Task Management+SLA)   │   con SLA y Escalamiento
└──────────────────────────┘
\`\`\`

---

## 🔍 Índices y Optimización

### Índices Principales

#### Schema: `public`
\`\`\`sql
-- User
CREATE UNIQUE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_role ON "User"(role);
CREATE INDEX idx_user_google_id ON "User"("googleId");

-- SQLLog
CREATE INDEX idx_sqllog_created_at ON "SQLLog"("createdAt");
CREATE INDEX idx_sqllog_status ON "SQLLog"(status);
CREATE INDEX idx_sqllog_user_email ON "SQLLog"(user_email);

-- LemonwayApiCallLog
CREATE INDEX idx_lemonway_api_log_created_at ON "LemonwayApiCallLog"(created_at);
CREATE INDEX idx_lemonway_api_log_success ON "LemonwayApiCallLog"(success);
CREATE INDEX idx_lemonway_api_log_retry_status ON "LemonwayApiCallLog"(retry_status);

-- LemonwayTransaction
CREATE INDEX idx_lemonway_transaction_wallet_id ON "LemonwayTransaction"(wallet_id);
CREATE INDEX idx_lemonway_transaction_type ON "LemonwayTransaction"(type);
CREATE INDEX idx_lemonway_transaction_status ON "LemonwayTransaction"(status);
CREATE INDEX idx_lemonway_transaction_created_at ON "LemonwayTransaction"(created_at);
\`\`\`

#### Schema: `investors`
\`\`\`sql
-- User
CREATE UNIQUE INDEX idx_investors_user_email ON investors."User"(email);
CREATE INDEX idx_investors_user_google_id ON investors."User"(google_id);
CREATE INDEX idx_investors_user_status ON investors."User"(status);
CREATE INDEX idx_investors_user_kyc_status ON investors."User"(kyc_status);

-- Session
CREATE UNIQUE INDEX idx_investors_session_token_hash ON investors."Session"(token_hash);
CREATE INDEX idx_investors_session_user_id ON investors."Session"(user_id);
CREATE INDEX idx_investors_session_expires_at ON investors."Session"(expires_at);
CREATE INDEX idx_investors_session_is_active ON investors."Session"(is_active);

-- WalletLink
CREATE INDEX idx_wallet_link_user_id ON investors."WalletLink"(user_id);
CREATE INDEX idx_wallet_link_wallet_id ON investors."WalletLink"(wallet_id);
CREATE INDEX idx_wallet_link_status ON investors."WalletLink"(status);
\`\`\`

#### Schema: `payments`
\`\`\`sql
-- payment_accounts
CREATE UNIQUE INDEX idx_payment_accounts_account_id ON payments.payment_accounts(account_id);
CREATE INDEX idx_payment_accounts_email ON payments.payment_accounts(email);
CREATE INDEX idx_payment_accounts_status ON payments.payment_accounts(status);
CREATE INDEX idx_payment_accounts_kyc_status ON payments.payment_accounts(kyc_status);
CREATE INDEX idx_payment_accounts_internal_id ON payments.payment_accounts(internal_id);
\`\`\`

#### Schema: `workflows`
\`\`\`sql
-- Workflow
CREATE INDEX idx_workflow_status ON workflows."Workflow"(status);

-- WorkflowRun
CREATE INDEX idx_workflow_run_workflow_id ON workflows."WorkflowRun"(workflow_id);
CREATE INDEX idx_workflow_run_status ON workflows."WorkflowRun"(status);
CREATE INDEX idx_workflow_run_trigger_event ON workflows."WorkflowRun"(trigger_event_name);
CREATE INDEX idx_workflow_run_started_at ON workflows."WorkflowRun"(started_at);

-- WorkflowStepRun
CREATE INDEX idx_workflow_step_run_workflow_run_id ON workflows."WorkflowStepRun"(workflow_run_id);
CREATE INDEX idx_workflow_step_run_status ON workflows."WorkflowStepRun"(status);
\`\`\`

#### Schema: `emails`
\`\`\`sql
-- email_templates
CREATE UNIQUE INDEX idx_email_templates_slug ON emails.email_templates(slug);
CREATE INDEX idx_email_templates_is_active ON emails.email_templates(is_active);

-- email_sends
CREATE INDEX idx_email_sends_template_id ON emails.email_sends(template_id);
CREATE INDEX idx_email_sends_to_email ON emails.email_sends(to_email);
CREATE INDEX idx_email_sends_status ON emails.email_sends(status);
CREATE INDEX idx_email_sends_created_at ON emails.email_sends(created_at);
CREATE INDEX idx_email_sends_sent_at ON emails.email_sends(sent_at);
\`\`\`

#### Schema: `lemonway_webhooks`
\`\`\`sql
-- WebhookDelivery
CREATE INDEX idx_webhook_delivery_notif_category ON lemonway_webhooks."WebhookDelivery"(notif_category);
CREATE INDEX idx_webhook_delivery_event_type ON lemonway_webhooks."WebhookDelivery"(event_type);
CREATE INDEX idx_webhook_delivery_wallet_int_id ON lemonway_webhooks."WebhookDelivery"(wallet_int_id);
CREATE INDEX idx_webhook_delivery_processing_status ON lemonway_webhooks."WebhookDelivery"(processing_status);
CREATE INDEX idx_webhook_delivery_received_at ON lemonway_webhooks."WebhookDelivery"(received_at);
\`\`\`

#### Schema: `virtual_accounts`
\`\`\`sql
-- cuentas_virtuales
CREATE INDEX idx_cuentas_virtuales_user_id ON virtual_accounts.cuentas_virtuales(user_id);
CREATE INDEX idx_cuentas_virtuales_lemonway_wallet_id ON virtual_accounts.cuentas_virtuales(lemonway_wallet_id);
CREATE INDEX idx_cuentas_virtuales_estado ON virtual_accounts.cuentas_virtuales(estado);

-- movimientos_cuenta
CREATE INDEX idx_movimientos_cuenta_virtual_id ON virtual_accounts.movimientos_cuenta(cuenta_virtual_id);
CREATE INDEX idx_movimientos_tipo_operacion ON virtual_accounts.movimientos_cuenta(tipo_operacion_id);
CREATE INDEX idx_movimientos_fecha_operacion ON virtual_accounts.movimientos_cuenta(fecha_operacion);
CREATE INDEX idx_movimientos_lemonway_transaction ON virtual_accounts.movimientos_cuenta(lemonway_transaction_id);
\`\`\`

#### Schema: `lemonway`
\`\`\`sql
-- wallets
CREATE UNIQUE INDEX idx_lemonway_wallets_lemonway_id ON lemonway.wallets(lemonway_id);
CREATE UNIQUE INDEX idx_lemonway_wallets_external_id ON lemonway.wallets(external_id);
CREATE INDEX idx_lemonway_wallets_email ON lemonway.wallets(email);
CREATE INDEX idx_lemonway_wallets_status ON lemonway.wallets(status);

-- transactions
CREATE UNIQUE INDEX idx_lemonway_trans_lemonway_id ON lemonway.transactions(lemonway_transaction_id);
CREATE INDEX idx_lemonway_trans_wallet_id ON lemonway.transactions(wallet_id);
CREATE INDEX idx_lemonway_trans_type ON lemonway.transactions(type);
CREATE INDEX idx_lemonway_trans_status ON lemonway.transactions(status);
CREATE INDEX idx_lemonway_trans_executed_at ON lemonway.transactions(executed_at);
\`\`\`

#### Schema: `documentos`
\`\`\`sql
-- document_type
CREATE UNIQUE INDEX idx_document_type_name ON documentos.document_type(name);

-- document_version
CREATE UNIQUE INDEX idx_document_version_version_number ON documentos.document_version(version_number);
CREATE INDEX idx_document_version_document_type_id ON documentos.document_version(document_type_id);

-- signature_session
CREATE UNIQUE INDEX idx_signature_session_token_firma ON documentos.signature_session(token_firma);
CREATE INDEX idx_signature_session_inversor_id ON documentos.signature_session(inversor_id);
CREATE INDEX idx_signature_session_document_version_id ON documentos.signature_session(document_version_id);
CREATE INDEX idx_signature_session_status ON documentos.signature_session(status);

-- signed_document
CREATE UNIQUE INDEX idx_signed_document_id ON documentos.signed_document(id);
CREATE INDEX idx_signed_document_signature_session_id ON documentos.signed_document(signature_session_id);
CREATE INDEX idx_signed_document_inversor_id ON documentos.signed_document(inversor_id);
CREATE INDEX idx_signed_document_document_version_id ON documentos.signed_document(document_version_id);
CREATE INDEX idx_signed_document_firma_valida ON documentos.signed_document(firma_valida);

-- signature_verification
CREATE UNIQUE INDEX idx_signature_verification_id ON documentos.signature_verification(id);
CREATE INDEX idx_signature_verification_signed_document_id ON documentos.signature_verification(signed_document_id);
\`\`\`

---

## 🔐 Seguridad y RBAC

### Sistema de Roles y Permisos

**Tablas involucradas:**
- `public.roles` - Definición de roles
- `public.permissions` - Permisos granulares
- `public.role_permissions` - Asignación permisos → roles
- `public.admin_user_roles` - Asignación usuarios → roles

**Roles predefinidos:**
\`\`\`sql
- admin: Acceso total
- operator: Operaciones del día a día
- viewer: Solo lectura
- finance: Acceso a cuentas y transacciones
- support: Acceso a usuarios e inversores
\`\`\`

**Permisos por recurso:**
\`\`\`sql
- users:read, users:write, users:delete
- payment_accounts:read, payment_accounts:write
- transactions:read, transactions:write
- workflows:read, workflows:write, workflows:execute
- investors:read, investors:write
- virtual_accounts:read, virtual_accounts:write
- settings:read, settings:write
- documentos:read, documentos:write
\`\`\`

---

## 📝 Notas de Implementación

### Convenciones

1. **IDs**: 
   - `uuid` para entidades nuevas (investors, workflows, virtual_accounts, documentos)
   - `integer` autoincremental para legacy (public, payments)

2. **Timestamps**:
   - `created_at` - Fecha de creación (NOT NULL)
   - `updated_at` - Última actualización
   - `deleted_at` - Soft delete

3. **Nomenclatura**:
   - `snake_case` para schemas y tablas SQL
   - `camelCase` para algunos campos legacy (public schema)
   - `PascalCase` para nombres de tablas Prisma-style (legacy)

4. **JSONB**:
   - `metadata` - Datos adicionales flexibles
   - `raw_data` / `raw_payload` - Respuestas completas de APIs externas
   - `config` - Configuración estructurada

5. **Soft Deletes**:
   - `investors.User` tiene `deleted_at`
   - `LemonwayApiCallLog` tiene `deleted_at`

### Transaccionalidad

**Operaciones críticas que requieren transacciones:**

1. **Creación de cuenta virtual + movimiento inicial**
2. **Procesamiento de webhook → actualización balance + movimiento**
3. **Ejecución de workflow step con actualización de contexto**
4. **Vinculación user ↔ wallet con validaciones**
5. **Firma de documento**

---

## 📊 Vistas Materializadas

### `investors.user_stats`
\`\`\`sql
CREATE MATERIALIZED VIEW investors.user_stats AS
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE status = 'active') as active_users,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_users,
  COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users,
  COUNT(*) FILTER (WHERE status = 'blocked') as blocked_users,
  COUNT(*) FILTER (WHERE kyc_status = 'approved') as kyc_approved,
  COUNT(*) FILTER (WHERE two_factor_enabled = true) as users_with_2fa,
  COUNT(*) FILTER (WHERE google_id IS NOT NULL) as users_with_google,
  COUNT(*) FILTER (WHERE apple_id IS NOT NULL) as users_with_apple,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as new_last_24h,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_last_7d,
  COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '24 hours') as active_last_24h
FROM investors."User"
WHERE deleted_at IS NULL;
\`\`\`

### `lemonway_webhooks.WebhookStats`
\`\`\`sql
CREATE MATERIALIZED VIEW lemonway_webhooks."WebhookStats" AS
SELECT
  COUNT(*) as total_webhooks,
  COUNT(*) FILTER (WHERE processing_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_count,
  COUNT(*) FILTER (WHERE processing_status = 'processed') as processed_count,
  COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE received_at >= NOW() - INTERVAL '24 hours') as last_24h_count,
  COUNT(*) FILTER (WHERE processing_status = 'failed' 
                   AND received_at >= NOW() - INTERVAL '24 hours') as failed_24h_count
FROM lemonway_webhooks."WebhookDelivery";
\`\`\`

**Refresh:** Se refrescan automáticamente cada hora mediante cron jobs.

---

## 🚀 Migraciones

**Orden de ejecución de scripts SQL:**

\`\`\`
001-create-tables.sql              → public core
002-create-payments-schema.sql     → payments schema
005-add-user-audit-log.sql         → auditoría
006-add-permissions-system.sql     → RBAC
007-add-roles-table.sql            → roles
008-create-sql-logs-table.sql      → logging
009-create-lemonway-tables.sql     → Lemonway core
057-create-cron-jobs-table.sql     → cron jobs
060-create-email-schema.sql        → emails
070-create-workflows-schema.sql    → workflows
080-create-lemonway-webhooks-...   → webhooks Lemonway
090-create-investors-schema.sql    → investors
099-create-admin-settings-table... → OAuth middleware
100-create-lemonway-webhooks-...   → webhooks refactor
101-create-virtual-accounts-...    → cuentas virtuales (NUEVO)
102-create-documentos-schema.sql   → documentos (NUEVO)
103-create-proyectos-schema.sql     → proyectos (NUEVO)
104-create-inversiones-schema.sql  → inversiones (NUEVO)
105-create-tasks-schema.sql        → tasks (NUEVO)
\`\`\`

**Nota:** Ejecutar en orden secuencial para mantener dependencias.

---

## 📞 Contacto

Para dudas sobre el modelo de datos, contactar al equipo de desarrollo en:
**tech@urbix.es**

---

**Última actualización:** Enero 2026  
**Versión del documento:** 1.0
