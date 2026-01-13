# Documentación - URBIX Integrations Platform

**Última actualización:** 8 de enero de 2026

## Índice General

### Arquitectura y Modelo de Datos
- [**ARQUITECTURA.md**](./ARQUITECTURA.md) - Arquitectura completa de la plataforma
- [**MODELO-DE-DATOS.md**](./MODELO-DE-DATOS.md) - Modelo de datos completo (12 schemas, 85 tablas)
- [**API-REFERENCE.md**](./API-REFERENCE.md) - Referencia de APIs REST

### Sistemas Principales
- [**AUTH-SYSTEM.md**](./AUTH-SYSTEM.md) - Sistema de autenticación y autorización (RBAC)
- [**RBAC-CUENTAS-VIRTUALES.md**](./RBAC-CUENTAS-VIRTUALES.md) - RBAC específico de cuentas virtuales
- [**DOCUMENTOS-Y-FIRMA.md**](./DOCUMENTOS-Y-FIRMA.md) - Gestión de documentos y firma electrónica
- [**IMPLEMENTACION-SISTEMA-TAREAS.md**](./IMPLEMENTACION-SISTEMA-TAREAS.md) - Sistema de tareas con SLA

### Integraciones
- [**LEMONWAY-FIELD-MAPPING.md**](./LEMONWAY-FIELD-MAPPING.md) - Mapeo de campos Lemonway
- [**IP-PROXY-SETUP.md**](./IP-PROXY-SETUP.md) - Configuración de IP proxy

### Testing
- [**UAT-SISTEMA-TAREAS.md**](./UAT-SISTEMA-TAREAS.md) - Plan de UAT para sistema de tareas

## Estructura de la Base de Datos

### Schemas (12 total)

1. **public** - Core del sistema (29 tablas)
   - Administración, RBAC, logs, config, SMS

2. **investors** (9 tablas)
   - Portal de inversores, autenticación, sesiones

3. **payments** (2 tablas)
   - Cuentas de pago sincronizadas con Lemonway

4. **lemonway** (6 tablas)
   - Espejo estructurado de Lemonway API v2

5. **lemonway_webhooks** (5 tablas)
   - Gestión de webhooks recibidos

6. **virtual_accounts** (3 tablas)
   - Contabilidad doble partida

7. **workflows** (6 tablas)
   - Motor de automatización

8. **emails** (3 tablas)
   - Sistema de email transaccional

9. **documentos** (4 tablas)
   - Gestión de documentos y firma

10. **proyectos** (2 tablas)
    - Proyectos de inversión

11. **inversiones** (2 tablas)
    - Inversiones de inversores

12. **tasks** (14 tablas)
    - Sistema de tareas con SLA y particionado

## Stack Tecnológico

### Frontend
- Next.js 16 (App Router)
- React 19.2
- TypeScript 5
- Tailwind CSS v4
- shadcn/ui

### Backend
- Next.js API Routes
- Neon Postgres (serverless)
- bcryptjs

### Integraciones
- HubSpot API
- Lemonway API v2
- Gmail API
- Google OAuth 2.0

## Sistema de Autenticación

### Módulos Centralizados en `lib/auth/`

- **types.ts** - Tipos TypeScript
- **session.ts** - Gestión de sesiones
- **roles.ts** - Verificación de roles
- **permissions.ts** - Permisos granulares
- **audit.ts** - Sistema de auditoría (AccessLog)
- **middleware.ts** - Helpers para proteger APIs
- **index.ts** - Punto de entrada único

### Niveles de Autorización

**Nivel 1 - Roles del Sistema:**
- superadmin, admin, user

**Nivel 2 - Permisos Granulares:**
- Definidos en tabla `Permission`
- Asignados a roles vía `RolePermission`
- Verificados con `hasPermission(user, permission)`

**Auditoría Completa:**
- Todos los accesos se registran en `AccessLog`
- Visualización en `/dashboard/access-logs`

## Convenciones

### Nomenclatura de Archivos
- APIs: `route.ts` en carpetas según path
- Componentes: `kebab-case.tsx`
- Utilities: `kebab-case.ts`

### Estructura de Código
- Server Components por defecto
- Client Components con `"use client"`
- Server Actions para mutaciones

### Base de Datos
- Schemas en minúsculas
- Tablas en snake_case o PascalCase según schema
- Foreign keys siempre indexadas
- Timestamps con timezone

## Contacto

Para dudas o actualizaciones de documentación:
- Equipo: URBIX Dev Team
- Fecha última actualización: 8 de enero de 2026
