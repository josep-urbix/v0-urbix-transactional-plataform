# Stack Tecnológico Completo - URBIX Transactional Platform

## 1. FRONTEND

### Framework y Runtime
- **Next.js 16** - Full-stack React framework con App Router
  - React Server Components (RSC)
  - Streaming SSR
  - Incremental Static Regeneration (ISR)
  - API Routes
- **React 19.2** - UI library con canary features
  - useEffectEvent para lógica no-reactiva
  - Activity component para gestión de UI
  - Suspense mejorado
- **TypeScript 5** - Type safety strict mode
  - Strict null checks
  - noImplicitAny enabled
  - Interfaces y tipos custom definidos

### UI/CSS
- **Tailwind CSS 4.1** - Utility-first CSS framework
  - CSS variables para theming
  - Responsive design (mobile-first)
  - Dark mode support
- **shadcn/ui** - Componentes accesibles Radix UI
  - Button, Card, Tabs, Dialog, Form, Input
  - Select, Dropdown-menu, Alert, Avatar
  - Totalmente customizable
- **Radix UI** - Base de componentes accesibles
  - @radix-ui/react-dialog
  - @radix-ui/react-dropdown-menu
  - @radix-ui/react-select
  - @radix-ui/react-tabs
  - @radix-ui/react-toast

### Visualización de Datos
- **Recharts** - Componentes gráficos React
  - LineChart, BarChart, AreaChart
  - Tooltips, Legend, ResponsiveContainer
- **Embla Carousel** - Carrusel accesible
  - Autoplay plugin
  - Wheel gestures

### Formularios y Validación
- **React Hook Form** - State management de formularios
  - Validación integrada
  - Rendimiento optimizado
- **Zod** - TypeScript-first schema validation
  - Tipos inferenciales
  - Validación compleja

### Editores
- **Tiptap** - Rich text editor
  - Markdown support
  - Colaborativo opcional
  - Extensiones custom

### Diagramas y Flows
- **TanStack Flow** - Diagrama de nodos interactivo
  - Visualización de workflows
  - Manejo de eventos

---

## 2. BACKEND

### Runtime y Framework
- **Node.js** - JavaScript runtime
- **Next.js 16 API Routes** - Backend serverless
  - Route handlers con GET, POST, PUT, DELETE
  - Middleware support
  - Error handling integrado

### Librerías Core
- **@neondatabase/serverless** - Driver PostgreSQL para Neon
  - Pool de conexiones
  - Transacciones ACID
- **bcrypt** - Hash de contraseñas
  - Salt rounds: 10
- **jsonwebtoken** - JWT tokens
  - Signing y verification
- **nodemailer** - Envío de emails
  - SMTP integration
  - HTML templates

---

## 3. AUTENTICACIÓN Y SEGURIDAD

### NextAuth 5 Beta
- **Providers**
  - Email & Password (local)
  - Google OAuth 2.0
- **Sessions**
  - HTTP-only cookies
  - Refresh token rotation
  - CSRF protection

### Criptografía
- **bcrypt** - Hashing de contraseñas (rounds: 10)
- **@webauthn/server** - WebAuthn/FIDO2
  - Autenticación sin contraseña
  - 2FA
- **speakeasy** - TOTP 2FA
  - Códigos de 6 dígitos
  - Backup codes

### RBAC (Role-Based Access Control)
- **Permisos granulares** en BD
  - `user_roles_permissions` tabla
  - `api_permissions` tabla
  - 18+ permisos Lemonway específicos
- **Middleware de autenticación**
  - `requireAdmin()` - Solo admins
  - `requireAuth()` - Usuarios autenticados
  - `requirePermission()` - Permisos específicos

### Seguridad de API
- **Rate limiting** - Upstash Redis (futura)
- **CORS** - Cross-origin configurado
- **Content Security Policy** - Headers de seguridad
- **Input validation** - Zod schemas

---

## 4. BASE DE DATOS

### PostgreSQL (Neon)
- **Versión**: PostgreSQL 15+
- **Hosting**: Neon (Serverless PostgreSQL)
- **Connection**: @neondatabase/serverless

### Esquemas Principales
- **public** - Esquema por defecto
  - users, sessions, permissions, roles
  - api_logs, access_logs
  - documents, document_types, document_signatures
  - virtual_accounts, payment_accounts
  - workflows, workflow_executions
  - tasks, subtasks

- **lemonway_temp** - Namespace Lemonway
  - lemonway_request_queue - Cola dual FIFO
  - lemonway_custom_queries - Queries personalizadas
  - lemonway_operation_types - Tipos de operación
  - MappedFields - Mapeo de campos
  - MovimientosCuenta - Transacciones
  - cuentas_virtuales - Cuentas virtuales
  - lemonway_sandbox_snapshots - Snapshots de testing

- **investor_auth** - Auth separado inversores
  - investor_sessions, investor_users

### Row Level Security (RLS)
- Habilitado en tablas sensibles
- Políticas por rol/usuario
- Auditoria automática

---

## 5. INTEGRACIONES EXTERNAS

### Lemonway
- **Versión API**: v3 REST
- **Autenticación**: OAuth 2.0 (Bearer token)
- **Endpoints principales**: 9 métodos core
  - getBearerToken()
  - getAccountDetails()
  - getTransactions()
  - getAccountBalances()
  - getKycStatus()
  - getAccountTransactions()
  - getWalletTransactions()
  - getAccountsByIds()
- **Librería custom**: `lib/lemonway-client.ts`
- **Cola de procesamiento**: Dual FIFO (URGENT/NORMAL)
- **Reintentos**: Backoff exponencial

### HubSpot
- **librería**: @hubspot/api-client
- **Funcionalidades**:
  - CRM sync
  - Meetings API
  - Webhooks
- **Autenticación**: API Token

### Google
- **Integraciones**:
  - Google Calendar API
  - Google Meet API
  - Google Service Account
- **Autenticación**: Service Account JSON

### Stripe
- **Versión**: API v1
- **Funcionalidades**: Pagos, suscripciones
- **Librerías**: stripe (npm package)

### AWS Bedrock
- **Integraciones**: AI models (Claude, Llama)
- **Uso**: AI SDK v5 integration

---

## 6. STATE MANAGEMENT

### SWR (Stale-While-Revalidate)
- **Librería**: swr
- **Uso**: Data fetching y caching en cliente
- **Features**:
  - Revalidation automática
  - Deduplication
  - Focus revalidation

### React Context
- **Lemonway context**: Métodos seleccionados
- **Theme context**: Dark/light mode
- **User context**: Session data

### React Hooks
- **useState** - State local
- **useEffect** - Side effects
- **useCallback** - Memoización
- **useMemo** - Performance optimization

---

## 7. STORAGE

### Vercel Blob
- **Almacenamiento**: Documentos, imágenes
- **Acceso**: @vercel/blob package
- **Token**: BLOB_READ_WRITE_TOKEN

### PostgreSQL
- **Almacenamiento**: Datos estructurados
- **Backups**: Automáticos Neon
- **Replicación**: Automática

---

## 8. EMAIL

### Nodemailer
- **Transport**: SMTP
- **Proveedor**: Gmail, SendGrid o custom SMTP
- **Features**:
  - HTML templates
  - Attachments
  - Tracking links

---

## 9. LOGGING Y MONITOREO

### Logging Custom
- **lib/logger.ts** - Logger wrapper
- **Niveles**: DEBUG, INFO, WARN, ERROR
- **Output**: Console + archivo

### Auditoría
- Tabla `access_logs` - Accesos a recursos
- Tabla `api_logs` - Llamadas API
- Tabla `LemonwayApiCallLog` - Calls Lemonway

---

## 10. DEPLOYMENT

### Vercel
- **Platform**: Vercel Edge Network
- **Regions**: Global CDN
- **Serverless Functions**: Unlimited concurrent
- **Environment Variables**: Desde Vercel dashboard

### GitHub
- **Repository**: v0-urbix-transactional-plataform
- **Branch**: main (production)
- **CI/CD**: Vercel git integration

### Domain
- **Custom domain**: integrations.urbix.es

---

## 11. VARIABLES DE ENTORNO

### Base de Datos
- `DATABASE_URL` - PostgreSQL connection string
- `POSTGRES_URL` - Alias
- `POSTGRES_URL_NON_POOLING` - Direct connection
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`
- `NEON_PROJECT_ID` - Neon project identifier

### Autenticación
- `NEXTAUTH_SECRET` - Secret para sesiones
- `NEXTAUTH_URL` - URL de autenticación
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - OAuth Google
- `ADMIN_PASSWORD` - Contraseña admin inicial

### Lemonway
- `LEMONWAY_API_BASE_URL` - URL base (en BD)
- `LEMONWAY_WALLET_ID` - ID de wallet (en BD)
- `LEMONWAY_API_TOKEN` - Bearer token (en BD)

### HubSpot
- `HUBSPOT_ACCESS_TOKEN` - API token
- `HUBSPOT_WEBHOOK_SECRET` - Webhook verification

### Google
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Email de service account
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` - Clave privada PEM

### Seguridad
- `WEBHOOK_DEBUG_MODE` - Debug mode para webhooks
- `CRON_SECRET` - Secret para cron jobs
- `ALLOWED_EMAIL_DOMAINS` - Dominios permitidos

### Storage
- `BLOB_READ_WRITE_TOKEN` - Token Vercel Blob
- `NEXT_PUBLIC_APP_URL` - URL pública de app

---

## 12. DEPENDENCIAS PRINCIPALES (package.json)

### Runtime
```json
{
  "next": "^16.0.0",
  "react": "^19.0.0-rc.7",
  "react-dom": "^19.0.0-rc.7"
}
```

### Database & ORM
```json
{
  "@neondatabase/serverless": "^0.9.8",
  "postgres": "^3.4.4"
}
```

### UI Components
```json
{
  "@radix-ui/react-dialog": "^1.1.2",
  "@radix-ui/react-dropdown-menu": "^2.1.2",
  "@radix-ui/react-select": "^2.1.2",
  "@radix-ui/react-tabs": "^1.1.1",
  "recharts": "^2.15.2"
}
```

### Formularios y Validación
```json
{
  "react-hook-form": "^7.57.0",
  "zod": "^3.23.8"
}
```

### Autenticación
```json
{
  "next-auth": "^5.0.0-beta.30",
  "bcrypt": "^5.1.1",
  "@webauthn/server": "^1.0.0"
}
```

### Integraciones
```json
{
  "@hubspot/api-client": "^14.5.1",
  "stripe": "^17.9.0",
  "nodemailer": "^6.9.8"
}
```

### Utilidades
```json
{
  "swr": "^2.2.5",
  "uuid": "^10.1.0",
  "date-fns": "^3.0.0"
}
```

---

## DIAGRAMA DE ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React 19)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  shadcn/ui (Radix UI) + Tailwind CSS 4.1                │   │
│  │  Componentes: Button, Card, Tabs, Form, Select, Dialog  │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  State Management: SWR + React Context + Hooks          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 NEXT.JS 16 API LAYER (Node.js)                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  NextAuth 5 (Sessions, OAuth, WebAuthn, TOTP)           │   │
│  │  RBAC Middleware + Permissions                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  API Routes: /api/admin/*, /api/lemonway/*, /api/...    │   │
│  │  Route Handlers con validación Zod                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            POSTGRESQL DATABASE (Neon Serverless)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Esquemas: public, lemonway_temp, investor_auth         │   │
│  │  RLS (Row Level Security) habilitado                     │   │
│  │  Auditoría automática (access_logs, api_logs)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   LEMONWAY       │ │   HUBSPOT        │ │   GOOGLE         │
│   OAuth 2.0      │ │   API Token      │ │   Service Acct   │
│   9 Methods      │ │   Webhooks       │ │   Calendar/Meet  │
│   Queue FIFO     │ │   CRM Sync       │ │   Drive          │
└──────────────────┘ └──────────────────┘ └──────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ↓
                    ┌──────────────────┐
                    │   STRIPE PAYMENT │
                    │   AWS BEDROCK AI │
                    │   VERCEL BLOB    │
                    └──────────────────┘
```

---

## VERSIONAMIENTO Y SEMVER

- **Next.js**: ^16.0.0 (latest)
- **React**: ^19.0.0-rc.7 (canary)
- **TypeScript**: ^5.x
- **Node.js**: 18+ recomendado

---

## DEPLOYMENTS

1. **Development**: `npm run dev` → localhost:3000
2. **Production**: Vercel (main branch) → integrations.urbix.es
3. **Staging**: Feature branches → Preview URLs

---

**Última actualización**: 2026-01-13
**Mantenedor**: URBIX Team
