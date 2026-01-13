# Arquitectura de la Plataforma URBIX Integrations

**Fecha de creación:** 5 de enero de 2026  
**Última actualización:** 7 de enero de 2026, 16:00h

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura de Capas](#arquitectura-de-capas)
4. [Módulos Principales](#módulos-principales)
5. [Flujos de Datos](#flujos-de-datos)
6. [Integraciones Externas](#integraciones-externas)
7. [Seguridad y Autenticación](#seguridad-y-autenticación)
8. [Escalabilidad y Performance](#escalabilidad-y-performance)
9. [Despliegue e Infraestructura](#despliegue-e-infraestructura)
10. [Diagramas](#diagramas)

---

## Visión General

**URBIX Integrations** es una plataforma middleware empresarial que orquesta integraciones entre sistemas internos y servicios externos (HubSpot, Lemonway, Gmail) para automatizar procesos de negocio, gestión de inversores, pagos y comunicaciones.

### Propósito
- **Centralizar integraciones** de terceros en una única plataforma
- **Automatizar workflows** complejos entre sistemas heterogéneos
- **Auditar y monitorizar** todas las transacciones y eventos
- **Gestionar inversores** con portal dedicado y autenticación segura
- **Administrar cuentas virtuales** y movimientos contables

### Principios de Diseño
- **API-First**: Todas las funcionalidades expuestas vía REST APIs
- **Transaccionalidad**: Garantizar consistencia en operaciones críticas
- **Trazabilidad**: Logging exhaustivo de todas las operaciones
- **Seguridad**: Autenticación robusta y control de acceso por roles (RBAC)
- **Escalabilidad**: Diseñado para crecer sin cambios arquitectónicos

---

## Stack Tecnológico

### Frontend
- **Next.js 16** - App Router con Server Components y Server Actions
- **React 19.2** - UI components con hooks modernos
- **TypeScript 5** - Strict mode para type safety
- **Tailwind CSS v4** - Utility-first styling con design tokens
- **shadcn/ui** - Component library (Radix UI + Tailwind)
- **SWR** - Data fetching con caché optimista y revalidación automática
- **Recharts** - Gráficos y visualizaciones de datos

### Backend
- **Next.js API Routes** - Endpoints RESTful serverless
- **Node.js 18+** - Runtime JavaScript
- **Neon Postgres** - Base de datos serverless con pooling de conexiones
- **bcryptjs** - Hashing de contraseñas
- **Zod** - Validación de schemas y tipos runtime

### Integraciones
- **HubSpot API** - CRM y gestión de contactos/meetings
- **Lemonway API v2** - Proveedor de pagos y wallets
- **Gmail API** - Envío de emails transaccionales
- **Google OAuth 2.0** - Autenticación delegada

### Infraestructura
- **Vercel** - Hosting, CI/CD, Edge Functions
- **Neon** - Base de datos Postgres serverless
- **GitHub** - Control de versiones y source of truth

---

## Arquitectura de Capas

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  ┌─────────────────────┐    ┌───────────────────────────┐  │
│  │  Admin Dashboard    │    │  Investor Portal          │  │
│  │  (Next.js SSR/CSR)  │    │  (Next.js SSR/CSR)        │  │
│  └─────────────────────┘    └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER (REST)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Admin   │  │ Investors│  │ Webhooks │  │ Workflows│   │
│  │   APIs   │  │   APIs   │  │   APIs   │  │   APIs   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │
│  │  Auth &    │  │  Workflow  │  │  Transaction       │    │
│  │  RBAC      │  │  Engine    │  │  Logger            │    │
│  └────────────┘  └────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐    │
│  │ SQL Client │  │ Repositories│ │  Data Mappers      │    │
│  │ (@neon)    │  │             │ │                    │    │
│  └────────────┘  └────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                          │
│              Neon Postgres (12 schemas)                      │
│  public | investors | workflows | emails | lemonway_*       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ HubSpot  │  │ Lemonway │  │  Gmail   │  │  Google  │   │
│  │   CRM    │  │ Payments │  │   SMTP   │  │  OAuth   │   │
│  └──────────┘  └────────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
\`\`\`

---

## Módulos Principales

### 1. **Admin Dashboard** (`/dashboard`)

Panel de administración para gestionar toda la plataforma.

**Submódulos:**
- **Dashboard Overview**: Métricas globales y KPIs
- **Usuarios**: Gestión de usuarios admin con roles y permisos (RBAC Level 2)
- **Access Logs**: Auditoría completa de accesos permitidos y denegados (NUEVO)
- **Inversores**: CRUD de inversores, sesiones, wallets, devices
- **Transacciones**: Historial de transacciones con HubSpot y Lemonway
- **Payment Accounts**: Sincronización y gestión de cuentas Lemonway
- **Cuentas Virtuales**: Dashboard y gestión de contabilidad interna
- **Proyectos**: Gestión de proyectos de inversión (NUEVO)
- **Inversiones**: Seguimiento de inversiones por proyecto e inversor (NUEVO)
- **Tareas**: Sistema de gestión de tareas con SLA y escalamiento (NUEVO)
- **Workflows**: Motor de automatización de procesos
- **Emails**: Templates y envíos transaccionales
- **SMS**: Configuración, templates y logs de SMS (NUEVO)
- **Documentos**: Gestión de tipos de documentos y versiones
- **Firmas**: Sesiones de firma y documentos firmados
- **SQL Logs**: Auditoría de queries a base de datos
- **Settings**: Configuración de integraciones y OAuth

### 2. **Investor Portal** (`/investor-portal`)
Portal privado para inversores con acceso a sus datos.

**Funcionalidades:**
- Registro con email + verificación
- Login con Google OAuth o email/password
- 2FA opcional (TOTP)
- Dashboard personalizado con saludo y datos del usuario
- Configuración de cuenta (cambio contraseña, enable 2FA)
- Soft delete (cuenta desactivable sin borrado físico)
- Gestión de sesiones y dispositivos

**Seguridad:**
- Cookies HTTP-only con tokens de sesión
- Row Level Security (RLS) en Supabase (futuro)
- Rate limiting en endpoints sensibles

### 3. **Workflows** (`/dashboard/workflows`)
Motor de automatización de procesos de negocio.

**Componentes:**
- **Event Registry**: Define eventos que disparan workflows
- **Workflow Engine**: Orquesta la ejecución de pasos
- **Step Handlers**: Ejecutores de acciones (email, HTTP, delay, conditional)
- **Template Engine**: Procesamiento de variables dinámicas
- **Execution Tracking**: Monitorización de runs y errores

**Casos de Uso:**
- Envío automático de emails post-registro
- Sincronización de datos entre sistemas
- Notificaciones basadas en eventos de Lemonway
- Escalado a humanos en caso de fallos

### 4. **Virtual Accounts** (`/dashboard/virtual-accounts`)
Sistema de contabilidad interna con cuentas virtuales y movimientos.

**Entidades:**
- **Cuenta Virtual**: Entidad con balance y metadatos
- **Movimiento Contable**: Débito/crédito con referencias
- **Tipo de Operación**: Catálogo de operaciones contables
- **Sincronización Lemonway**: Asociación con wallets reales

**Características:**
- Transaccionalidad ACID en movimientos
- Validación de saldo antes de débitos
- Dashboard con KPIs y gráficos
- Histórico completo de movimientos
- Trazabilidad con LemonwayTransaction

### 5. **Email System** (`/dashboard/emails`)
Sistema de email transaccional con templates y tracking.

**Funcionalidades:**
- **Templates**: Editor rich-text (TipTap) con variables
- **Envíos**: Queue de emails con retry automático
- **Tracking**: Open/Click tracking con pixels/links
- **Gmail Integration**: Envío vía Gmail API con OAuth

### 6. **Payment Accounts** (`/dashboard/payment-accounts`)
Sincronización y gestión de cuentas Lemonway.

**Operaciones:**
- Sync bidireccional con Lemonway API v2
- Deduplicación de transacciones
- Retry queue con exponential backoff
- Field mappings configurables
- Auditoría completa de API calls

### 7. **Webhooks**
Receptores de eventos externos.

**Endpoints:**
- `/api/webhooks/lemonway`: Eventos de Lemonway (pagos, KYC, etc.)
- `/api/hubspot/meetings/webhook`: Eventos de meetings en HubSpot

**Procesamiento:**
- Validación de firma/API key
- Logging en `lemonway_webhooks.WebhookDelivery`
- Procesamiento asíncrono con handlers específicos
- Reintento automático de webhooks fallidos

---

## Flujos de Datos

### Flujo 1: Registro de Inversor

\`\`\`
Usuario → /investor-portal/register
         ↓
  POST /api/investors/auth/register
         ↓
  Validación (Zod schema)
         ↓
  Verificar email único
         ↓
  Hash password (bcrypt)
         ↓
  INSERT en investors.User
         ↓
  Enviar email verificación
         ↓
  Retornar userId
         ↓
  Redirigir a /verify-email
\`\`\`

### Flujo 2: Procesamiento de Webhook Lemonway

\`\`\`
Lemonway → POST /api/webhooks/lemonway
                 ↓
         Validar API key
                 ↓
         Log raw payload en LemonwayTransaction
                 ↓
         Parsear NotifCategory
                 ↓
         INSERT en WebhookDelivery (pending)
                 ↓
         Buscar handler en HANDLER_REGISTRY
                 ↓
         Ejecutar handler específico
           ├── MONEY_IN_WIRE
           ├── MONEY_OUT
           ├── KYC_STATUS
           └── ...
                 ↓
         Actualizar WebhookDelivery (success/error)
                 ↓
         Retornar 200 OK
\`\`\`

### Flujo 3: Ejecución de Workflow

\`\`\`
Evento → POST /api/workflows/emit
              ↓
      Buscar workflows activos para evento
              ↓
      INSERT en WorkflowRun (running)
              ↓
      Iterar por steps del workflow
              ↓
      ┌─────────────────────┐
      │ Ejecutar Step       │
      │ - Email             │
      │ - HTTP Request      │
      │ - Delay             │
      │ - Conditional       │
      └─────────────────────┘
              ↓
      Log resultado en WorkflowRunStep
              ↓
      ¿Step failed?
         ├── Sí → Marcar run como failed
         └── No → Continuar
              ↓
      Actualizar WorkflowRun (completed)
\`\`\`

---

## Integraciones Externas

### HubSpot CRM
**Propósito**: Gestión de contactos, meetings y pipeline de ventas

**APIs Utilizadas:**
- Contacts API (lectura/escritura)
- Engagements API (meetings)
- Webhooks (notificaciones de eventos)

**Flujo de Integración:**
1. Webhook de HubSpot notifica meeting creado
2. Extraer enlaces (Google Meet, reschedule, cancel) del body
3. Actualizar contacto en HubSpot con custom properties
4. Loggear transacción en `HubSpotMeetingTransaction`

### Lemonway Payments
**Propósito**: Proveedor de pagos, wallets y KYC

**APIs Utilizadas:**
- GetWalletDetails (v2)
- MoneyIn / MoneyOut (v2)
- RegisterWallet (v2)
- GetMoneyInTransDetails (v2)
- Webhooks

**Sincronización:**
- Polling periódico con `sync-transactions` cron job
- Webhook push para eventos en tiempo real
- Deduplicación por `transaction_id`
- Retry queue con exponential backoff

### Gmail API
**Propósito**: Envío de emails transaccionales

**OAuth Flow:**
1. Configurar Service Account en Google Cloud
2. Delegar domain-wide authority
3. Obtener tokens con JWT
4. Enviar emails vía Gmail API

**Ventajas:**
- Sin límites SMTP tradicionales
- Tracking nativo de bounces
- Entregabilidad superior

### Google OAuth 2.0
**Propósito**: Autenticación delegada (SSO)

**Implementación:**
- Authorization Code Flow
- Scopes: `openid`, `email`, `profile`
- Configuración separada para admin y inversores
- Restricción de dominios permitidos (admin: `urbix.es`)

---

## Seguridad y Autenticación

### Autenticación Admin

**Métodos:**
1. **Email + Password**: bcrypt con 10 salt rounds
2. **Google OAuth**: Restringido a `@urbix.es`

**Session Management:**
- Tokens firmados con `NEXTAUTH_SECRET`
- Cookies HTTP-only, Secure, SameSite=Lax
- Expiración: 7 días
- Refresh automático en cada request

**Rate Limiting:**
- Max 5 intentos fallidos / 15 minutos
- Lockout temporal en caso de abuse

### Autenticación Inversores

**Métodos:**
1. **Email + Password**: bcrypt con 10 salt rounds
2. **Google OAuth**: Sin restricciones de dominio
3. **Magic Link**: Token temporal en email (futuro)

**2FA (TOTP):**
- QR code generado con `otplib`
- Backup codes de recuperación
- Obligatorio para operaciones sensibles

### RBAC (Role-Based Access Control)

**Roles:**
- **Super Admin**: Acceso total
- **Admin**: Gestión de inversores y transacciones
- **Editor**: Modificación de datos sin eliminación
- **Viewer**: Solo lectura

**Permisos:**
- Granulares por recurso y acción (READ, WRITE, DELETE)
- Asignados a roles mediante `RolePermission`
- Verificación en middleware de API routes

**Implementación:**
\`\`\`typescript
// Middleware de autorización
export async function requirePermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  // Consultar permisos del usuario vía roles
  const hasPermission = await checkUserPermission(userId, resource, action)
  if (!hasPermission) throw new UnauthorizedError()
  return true
}
\`\`\`

### Seguridad de Webhooks

**Validación:**
- API Key en header `x-api-key`
- Timing-safe comparison para prevenir timing attacks
- IP whitelisting (opcional)

**Protección contra Replay Attacks:**
- Timestamp validation (máx 5 minutos)
- Deduplicación por `webhook_id`

---

## Escalabilidad y Performance

### Database Optimization

**Indexing:**
- Índices en foreign keys
- Índices compuestos en queries frecuentes
- Índices parciales para queries con WHERE
- Ejemplo: `CREATE INDEX idx_transactions_status ON transactions(status) WHERE status != 'completed';`

**Connection Pooling:**
- Neon serverless con auto-scaling
- Max 100 conexiones concurrentes
- Timeout: 10 segundos

**Query Optimization:**
- Evitar N+1 queries con JOINs
- Paginación cursor-based para grandes resultados
- Agregaciones en DB en lugar de app layer

### Caching Strategy

**Client-Side (SWR):**
- Revalidate on focus
- Dedupe requests automáticas
- Optimistic updates

**Server-Side:**
- Edge caching en Vercel (headers `Cache-Control`)
- Redis futuro para sesiones distribuidas

### Async Processing

**Use Cases:**
- Envío de emails (queue)
- Sincronización de transacciones Lemonway
- Procesamiento de webhooks pesados

**Implementación:**
- Vercel Cron Jobs para tareas periódicas
- Background jobs con `setTimeout` en API routes
- Futuro: BullMQ + Redis para queues robustas

---

## Despliegue e Infraestructura

### CI/CD Pipeline

\`\`\`
GitHub Push → Vercel Deploy
                  ↓
         Build Next.js app
                  ↓
         Run TypeScript checks
                  ↓
         Deploy to Preview (PR) o Production (main)
                  ↓
         Invalidate Edge Cache
                  ↓
         Run smoke tests (futuro)
\`\`\`

### Environments

**Development:**
- Local con `npm run dev`
- Database: Neon development branch
- Hot reload habilitado

**Preview:**
- Automático en cada PR
- URL única: `https://integrations-urbix-[hash].vercel.app`
- Database: Neon preview branch

**Production:**
- Deploy desde `main` branch
- URL: `https://integrations.urbix.es`
- Database: Neon production branch

### Monitoring

**Logs:**
- Vercel Functions Logs (stdout/stderr)
- Custom `SQLLog` table for queries
- `LemonwayTransaction` for audit trail

**Metrics:**
- Vercel Analytics (Web Vitals, Core Web Vitals)
- Error tracking with sentry (futuro)
- Uptime monitoring with Vercel Status

**Alertas:**
- Email en caso de deploy fallido
- Slack integration for critical errors (futuro)

---

## Diagramas

### Diagrama de Schemas de Base de Datos

\`\`\`
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   public     │      │  investors   │      │  workflows   │
├──────────────┤      ├──────────────┤      ├──────────────┤
│ User         │      │ User         │      │ Event        │
│ Session      │      │ Session      │      │ Workflow     │
│ Role         │      │ DeviceInfo   │      │ WorkflowStep │
│ Permission   │      │ Settings     │      │ WorkflowRun  │
│ RolePermission│     │ WalletInfo   │      │ RunStep      │
│ UserAuditLog │      │ Activity     │      └──────────────┘
│ ApiCallLog   │      └──────────────┘
│ CronJob      │      
│ CronExecution│      ┌──────────────┐
│ AdminSettings│      │    emails    │
└──────────────┘      ├──────────────┤
                      │ Template     │
┌──────────────┐      │ EmailSend    │
│  payments    │      │ Click        │
├──────────────┤      │ Config       │
│ PaymentAccount│     └──────────────┘
└──────────────┘      
                      ┌──────────────┐
┌──────────────┐      │lemonway_*    │
│virtual_accounts│    ├──────────────┤
├──────────────┤      │ WebhookDelivery
│ CuentaVirtual│      │ Transaction  │
│ Movimiento   │      │ ApiCall      │
│ TipoOperacion│      │ RetryQueue   │
│ LemonwaySync │      │ FieldMapping │
└──────────────┘      └──────────────┘
\`\`\`

### Diagrama de Componentes React

\`\`\`
App Root
├── AdminLayout
│   ├── DashboardNav (sidebar)
│   ├── Header (top bar)
│   └── Page Content
│       ├── DashboardOverview
│       ├── VirtualAccountsDashboard
│       ├── InvestorsManager
│       ├── WorkflowBuilder
│       └── ...
│
└── InvestorPortalLayout
    ├── InvestorDashboard
    ├── InvestorSettings
    └── LoginForm / RegisterForm
\`\`\`

---

## Conclusión

La arquitectura de **URBIX Integrations** está diseñada para ser:
- **Modular**: Cada módulo es independiente y reemplazable
- **Escalable**: Serverless con auto-scaling en Vercel y Neon
- **Segura**: Autenticación robusta, RBAC, y auditoría exhaustiva
- **Mantenible**: TypeScript strict, patterns consistentes, documentación
- **Observable**: Logging completo y métricas en tiempo real

La plataforma está preparada para crecer en funcionalidad y usuarios sin refactorings arquitectónicos mayores.

---

**Versión del documento**: 1.0  
**Autor**: URBIX Dev Team
