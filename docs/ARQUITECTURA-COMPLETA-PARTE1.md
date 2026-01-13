# ARQUITECTURA COMPLETA URBIX TRANSACTIONAL PLATFORM

## 1. VISIÓN GENERAL DEL SISTEMA

**URBIX** es una plataforma de inversiones tecnológica que facilita la conexión entre **inversores** y **proyectos inmobiliarios/tecnológicos**, automatizando el ciclo completo: desde registro y KYC, hasta firma digital de documentos, procesamiento de pagos, y gestión de cuentas virtuales.

### 1.1 Actores Principales

- **Inversores:** Personas físicas/jurídicas que invierten en proyectos
- **Administradores:** Personal de URBIX que gestiona inversiones, aprobaciones y compliance
- **Sistema:** Automatización de procesos, crons, webhooks
- **Proveedores Externos:** Lemonway (fintech), HubSpot (CRM), Stripe (pagos), servicios de email

### 1.2 Pilares del Sistema

1. **Autenticación Robusta:** NextAuth + 2FA (TOTP)
2. **RBAC Granular:** SuperAdmin, Admin, Manager, User, Investor
3. **KYC/AML:** Verificación de identidad y compliance
4. **Gestión de Tareas:** SLA tracking, escalaciones automáticas
5. **Cuentas Virtuales:** Wallets con saldo, movimientos, historial
6. **Flujos de Negocio:** Inversión end-to-end con aprobaciones
7. **Auditoría Completa:** AccessLog, SQLLog, UserAuditLog
8. **Integraciones:** Lemonway, HubSpot, Stripe, Email SMTP

---

## 2. ARQUITECTURA TÉCNICA GENERAL

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                           │
│  (Next.js 16, React 19, TypeScript, Tailwind + shadcn/ui)  │
│                                                              │
│  ├─ Public Pages (landing, login)                           │
│  ├─ Admin Dashboard (/dashboard/...)                        │
│  └─ Investor Portal (/investor/...)                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  API GATEWAY LAYER                          │
│      (Next.js API Routes + Route Handlers)                  │
│                                                              │
│  /api/admin/... (SuperAdmin required)                       │
│  /api/investors/... (Auth required, Investor role)          │
│  /api/webhooks/... (Signature verification)                 │
│  /api/cron/... (Secret token)                               │
│  /api/auth/... (Public)                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              BUSINESS LOGIC LAYER                           │
│  (Services, Repositories, Utilities)                        │
│                                                              │
│  ├─ Authentication Service                                  │
│  ├─ Permission/RBAC Service                                 │
│  ├─ Task Management Service                                 │
│  ├─ Investment Service                                      │
│  ├─ Lemonway Integration Service                            │
│  ├─ Document Signing Service                                │
│  ├─ Email Service                                           │
│  └─ Workflow Engine                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATA ACCESS LAYER                          │
│      (Repositories, SQL queries)                            │
│                                                              │
│  ├─ User Repository                                         │
│  ├─ Task Repository                                         │
│  ├─ Investment Repository                                   │
│  ├─ Virtual Account Repository                              │
│  ├─ Payment Account Repository                              │
│  └─ Document Repository                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE LAYER                            │
│         (PostgreSQL via Neon, 20+ schemas)                  │
│                                                              │
│  ├─ public.* (Auth, Users, System)                          │
│  ├─ investors.* (Inversores y KYC)                          │
│  ├─ inversiones.* (Inversiones)                             │
│  ├─ virtual_accounts.* (Cuentas virtuales)                  │
│  ├─ tasks.* (Sistema de tareas)                             │
│  ├─ documentos.* (Firma digital)                            │
│  ├─ payments.* (Cuentas de pago)                            │
│  ├─ lemonway_temp.* (Importación Lemonway)                  │
│  ├─ workflows.* (Motor de workflows)                        │
│  ├─ emails.* (Templates, historial)                         │
│  └─ logs.* (Auditoría, logs)                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              EXTERNAL INTEGRATIONS                          │
│                                                              │
│  ├─ Lemonway API (Wallets, Transacciones)                   │
│  ├─ HubSpot API (CRM, Meetings)                             │
│  ├─ Stripe API (Pagos)                                      │
│  ├─ Email SMTP (SendGrid, AWS SES)                          │
│  ├─ Vercel Blob (Almacenamiento archivos)                   │
│  ├─ Google OAuth (SSO)                                      │
│  └─ Webhooks (Lemonway, HubSpot, Stripe)                    │
└─────────────────────────────────────────────────────────────┘
\`\`\`

---

## 3. ENTIDADES DE DATOS PRINCIPALES

### 3.1 Esquema Public (Sistema Core)

\`\`\`sql
-- USUARIOS Y SESIONES
public.User
  ├─ id (UUID)
  ├─ email (string, unique)
  ├─ password_hash (string)
  ├─ role (superadmin | admin | manager | user | investor)
  ├─ is_active (boolean)
  ├─ totp_secret (string) -- Para 2FA
  ├─ created_at (timestamp)
  └─ updated_at (timestamp)

public.Session
  ├─ sessionToken (string, unique)
  ├─ userId (UUID, FK User)
  ├─ expires (timestamp)
  ├─ refreshToken (string)
  ├─ device_fingerprint (string)
  └─ last_activity (timestamp)

public.Account (OAuth)
  ├─ userId (UUID, FK User)
  ├─ type (google, email)
  ├─ provider_id (string)
  └─ provider_account_id (string)

-- AUDITORÍA Y SEGURIDAD
public.AccessLog
  ├─ id (UUID)
  ├─ userId (UUID, FK User)
  ├─ userEmail (string)
  ├─ resource (string) -- "investors:wallets", "tasks:create"
  ├─ action (string) -- "read", "create", "update", "delete"
  ├─ allowed (boolean)
  ├─ deniedReason (string) -- "No es admin", "Permission denied"
  ├─ timestamp (timestamp)
  └─ ip_address (string)

public.UserAuditLog
  ├─ id (UUID)
  ├─ user_id (UUID, FK User)
  ├─ accion (string) -- "PASSWORD_CHANGED", "2FA_ENABLED"
  ├─ tabla_afectada (string)
  ├─ registro_id (string)
  ├─ cambios (jsonb) -- {campo: {old, new}}
  ├─ timestamp (timestamp)
  └─ ip_address (string)

public.SQLLog
  ├─ id (UUID)
  ├─ query (text)
  ├─ params (jsonb)
  ├─ ejecutado_por (UUID, FK User)
  ├─ timestamp (timestamp)
  └─ duration_ms (integer)

public.LoginAttempt
  ├─ id (UUID)
  ├─ email (string)
  ├─ success (boolean)
  ├─ ip_address (string)
  ├─ device_fingerprint (string)
  ├─ timestamp (timestamp)
  └─ failure_reason (string)

-- CONFIGURACIÓN Y SISTEMA
public.Settings
  ├─ key (string, unique)
  └─ value (string)

public.Permission
  ├─ id (UUID)
  ├─ resource (string) -- "investors:wallets"
  ├─ action (string) -- "read"
  ├─ description (text)
  └─ created_at (timestamp)

public.Role
  ├─ id (UUID)
  ├─ name (string, unique) -- "superadmin", "admin", "investor"
  ├─ is_system_role (boolean)
  └─ created_at (timestamp)

public.RolePermission
  ├─ role_id (UUID, FK Role)
  ├─ permission_id (UUID, FK Permission)
  └─ assigned_at (timestamp)

public.LemonwayApiCallRetryHistory
  ├─ id (UUID)
  ├─ api_call_id (UUID, FK LemonwayApiCallLog)
  ├─ retry_count (integer)
  ├─ next_retry_at (timestamp)
  ├─ last_error (text)
  └─ created_at (timestamp)
\`\`\`

### 3.2 Esquema Investors (Inversores)

\`\`\`sql
investors.User (Diferente de public.User)
  ├─ id (UUID)
  ├─ email (string, unique)
  ├─ password_hash (string)
  ├─ nombre (string)
  ├─ apellido (string)
  ├─ tipo_documento (DNI | NIE | PASAPORTE)
  ├─ numero_documento (string)
  ├─ telefono (string)
  ├─ pais_residencia (string)
  ├─ estado_registro (REGISTRO_INCOMPLETO | REGISTRO_COMPLETO | BLOQUEADO)
  ├─ kyc_status (PENDIENTE | VERIFICACION_PENDIENTE | VERIFICADO | RECHAZADO)
  ├─ created_at (timestamp)
  └─ updated_at (timestamp)

investors.KycDocument
  ├─ id (UUID)
  ├─ user_id (UUID, FK investors.User)
  ├─ tipo_documento (DNI | PERMISO_RESIDENCIA | COMPROBANTE_DOMICILIO)
  ├─ url_documento (string) -- Vercel Blob
  ├─ url_selfie (string) -- Vercel Blob
  ├─ estado (PENDIENTE_REVISION | APROBADO | RECHAZADO)
  ├─ feedback_admin (text)
  ├─ uploaded_at (timestamp)
  └─ reviewed_at (timestamp)

investors.WalletLinked
  ├─ id (UUID)
  ├─ user_id (UUID, FK investors.User)
  ├─ lemonway_wallet_id (string) -- ID del wallet en Lemonway
  ├─ is_primary (boolean)
  ├─ wallet_status (active | pending | blocked)
  ├─ linked_at (timestamp)
  ├─ verified_at (timestamp, nullable)
  └─ verification_code (string, nullable) -- Para double opt-in
