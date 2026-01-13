# Sistema de Autenticación y Autorización - URBIX

## Arquitectura

El sistema de autenticación y autorización está centralizado en `lib/auth/` y consta de:

### Módulos Principales

1. **`lib/auth/types.ts`** - Tipos TypeScript
   - `SystemRole`: 'superadmin' | 'admin' | 'user'
   - `AuthUser`: Usuario autenticado
   - `AccessLogEntry`: Entrada de log de auditoría
   - `PermissionCheck`: Resultado de verificación de permisos

2. **`lib/auth/session.ts`** - Gestión de sesiones
   - `getSession()`: Obtiene sesión actual del usuario
   - `getServerSession()`: Versión para Server Components
   - `requireAuth()`: Requiere autenticación

3. **`lib/auth/roles.ts`** - Verificación de roles
   - `isAdminRole(role)`: Verifica si es admin o superadmin
   - `hasFullAccess(role)`: Verifica si es superadmin
   - `hasMinRole(userRole, minRole)`: Verifica nivel mínimo de rol
   - `hasRole(userRole, allowedRoles)`: Verifica si tiene uno de los roles

4. **`lib/auth/permissions.ts`** - Permisos granulares desde BD
   - `hasPermission(user, permission)`: Verifica permiso específico
   - `getUserPermissions(user)`: Obtiene todos los permisos del usuario
   - `clearPermissionCache(userId)`: Limpia caché de permisos
   - Caché de 5 minutos para optimizar consultas

5. **`lib/auth/audit.ts`** - Sistema de auditoría
   - `logAccess(entry)`: Registra cualquier acceso
   - `logAllowedAccess(...)`: Registra acceso permitido
   - `logDeniedAccess(...)`: Registra acceso denegado
   - `getAccessHistory(userId)`: Historial de accesos de un usuario
   - `getDeniedAccesses()`: Accesos denegados recientes
   - `getAccessStats()`: Estadísticas de accesos

6. **`lib/auth/middleware.ts`** - Helpers para proteger APIs
   - `requireAdmin(user, resource, action, request)`: Requiere rol admin
   - `requireSuperAdmin(...)`: Requiere rol superadmin
   - `requireMinRole(...)`: Requiere nivel mínimo de rol
   - `requirePermission(...)`: Requiere permiso específico
   - `requireRole(allowedRoles)`: Compatibilidad con código antiguo

7. **`lib/auth/index.ts`** - Punto de entrada único
   - Exporta todas las funciones de los módulos anteriores

## Base de Datos

### Tabla `AccessLog`

Registra todos los intentos de acceso (permitidos y denegados):

```sql
CREATE TABLE "AccessLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT,
  "userEmail" TEXT,
  "userRole" TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  "deniedReason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "requestPath" TEXT,
  "requestMethod" TEXT,
  metadata JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_access_log_user_id ON "AccessLog"("userId");
CREATE INDEX idx_access_log_created_at ON "AccessLog"("createdAt" DESC);
CREATE INDEX idx_access_log_allowed ON "AccessLog"("allowed");
CREATE INDEX idx_access_log_resource ON "AccessLog"(resource);
```

**Campos:**
- `userId`: ID del usuario que intenta acceder (puede ser NULL si no está autenticado)
- `userEmail`: Email del usuario para búsquedas más fáciles
- `userRole`: Rol del usuario en el momento del acceso
- `resource`: Recurso al que se intenta acceder (ej: "users", "config", "payment_accounts")
- `action`: Acción que se intenta realizar (ej: "read", "write", "delete")
- `allowed`: TRUE si se permitió el acceso, FALSE si fue denegado
- `deniedReason`: Razón de denegación (ej: "No es admin", "Sin permisos")
- `ipAddress`: IP desde donde se hizo la petición
- `userAgent`: User agent del navegador/cliente
- `requestPath`: Path de la URL (ej: "/api/admin/users")
- `requestMethod`: Método HTTP (GET, POST, PUT, DELETE)
- `metadata`: Datos adicionales en formato JSON

### Tabla `Permission`

Permisos granulares disponibles:

```sql
CREATE TABLE "Permission" (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT
);
```

### Tabla `RolePermission`

Asignación de permisos a roles:

```sql
CREATE TABLE "RolePermission" (
  role TEXT NOT NULL,
  "permissionId" UUID NOT NULL REFERENCES "Permission"(id),
  PRIMARY KEY (role, "permissionId")
);
```

### Tabla `Role`

Roles del sistema:

```sql
CREATE TABLE "Role" (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  "isSystem" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

**Roles del sistema:**
- **superadmin**: Acceso completo sin restricciones
- **admin**: Acceso administrativo según permisos asignados
- **user**: Usuario estándar con permisos limitados

## Uso en APIs

### Patrón recomendado (con auditoría automática):

```typescript
import { getSession, requireAdmin } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getSession()
  
  // Verifica rol Y registra el acceso automáticamente
  const authResult = await requireAdmin(session?.user, 'resource_name', 'action_name', request)
  if (!authResult.success) return authResult.error
  
  // Lógica de la API...
}
```

### Otros helpers disponibles:

```typescript
// Requiere superadmin
const authResult = await requireSuperAdmin(session?.user, 'system_config', 'edit', request)

// Requiere rol mínimo
const authResult = await requireMinRole(session?.user, 'admin', 'users', 'view', request)

// Requiere permiso específico
const authResult = await requirePermission(session?.user, 'users.delete', 'users', 'delete', request)
```

### Patrón antiguo (sin auditoría):

```typescript
import { getSession, isAdminRole } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  
  // Lógica...
}
```

**Nota:** El patrón antiguo NO registra accesos. Se recomienda migrar a los helpers del middleware.

## Uso en Server Components

```typescript
import { getSession, isAdminRole } from '@/lib/auth'

export default async function AdminPage() {
  const session = await getSession()
  
  if (!session || !isAdminRole(session.user.role)) {
    redirect('/dashboard')
  }
  
  return <div>...</div>
}
```

## Jerarquía de Roles

```
superadmin > admin > user
```

- **superadmin**: Acceso completo sin restricciones
- **admin**: Acceso según permisos asignados en BD
- **user**: Acceso básico + permisos específicos

## Visualización de Logs

Los logs de auditoría están disponibles en:
- **URL**: `/dashboard/access-logs`
- **API**: `/api/admin/access-logs`

Filtra por:
- Permitidos/Denegados
- Recurso
- Usuario
- Rango de fechas

## Mejores Prácticas

1. **Usar helpers del middleware**: Automatizan la auditoría
2. **Especificar recurso y acción**: Facilita filtrado de logs
3. **Verificar en server-side**: Client-side es solo para UX
4. **Re-validar rol crítico**: APIs sensibles deben re-verificar contra BD
5. **Revisar logs regularmente**: Detectar intentos de acceso no autorizados

## Seguridad

- ✅ Roles desde BD (no hardcodeados)
- ✅ Re-validación de rol en tiempo real
- ✅ Logging completo de accesos
- ✅ Permisos granulares desde BD
- ✅ Caché con invalidación automática
- ✅ Normalización automática de roles
- ✅ Verificación server-side obligatoria

## Ejemplo Completo

```typescript
// app/api/admin/users/route.ts
import { NextResponse } from 'next/server'
import { getSession, requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET(request: Request) {
  const session = await getSession()
  
  // Verifica admin Y registra acceso
  const authResult = await requireAdmin(session?.user, 'users', 'list', request)
  if (!authResult.success) return authResult.error
  
  const users = await sql`SELECT * FROM "User"`
  return NextResponse.json({ users })
}

export async function DELETE(request: Request) {
  const session = await getSession()
  
  // Requiere permiso específico para eliminar
  const authResult = await requirePermission(session?.user, 'users.delete', 'users', 'delete', request)
  if (!authResult.success) return authResult.error
  
  const { id } = await request.json()
  await sql`DELETE FROM "User" WHERE id = ${id}`
  
  return NextResponse.json({ success: true })
}
