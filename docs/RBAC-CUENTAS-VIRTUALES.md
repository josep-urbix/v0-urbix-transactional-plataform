# RBAC - Cuentas Virtuales

## Permisos Disponibles

El módulo de Cuentas Virtuales incluye los siguientes permisos en el sistema RBAC:

| Recurso | Acción | Nombre | Descripción |
|---------|--------|--------|-------------|
| `VIRTUAL_ACCOUNTS` | `VIEW_ACCOUNTS` | Ver Cuentas Virtuales | Ver lista de cuentas virtuales |
| `VIRTUAL_ACCOUNTS` | `VIEW_ACCOUNT_DETAIL` | Ver Detalle de Cuenta | Ver detalle completo de una cuenta virtual |
| `VIRTUAL_ACCOUNTS` | `VIEW_MOVEMENTS` | Ver Movimientos | Ver historial de movimientos de cuenta |
| `VIRTUAL_ACCOUNTS` | `MANAGE_OPERATION_TYPES` | Gestionar Tipos Operación | Crear, editar y eliminar tipos de operación contable |
| `VIRTUAL_ACCOUNTS` | `CREATE_MANUAL_ADJUSTMENT` | Crear Ajuste Manual | Crear solicitud de ajuste manual de saldo |
| `VIRTUAL_ACCOUNTS` | `APPROVE_MANUAL_ADJUSTMENT` | Aprobar Ajuste Manual | Aprobar o rechazar ajustes manuales de saldo |
| `VIRTUAL_ACCOUNTS` | `VIEW_LEMONWAY_DATA` | Ver Datos Lemonway | Ver datos de sincronización con Lemonway |
| `VIRTUAL_ACCOUNTS` | `LINK_WALLET` | Vincular Wallet | Vincular wallet de Lemonway a cuenta virtual |

## Configuración de Roles

### Rol Admin (Por Defecto)

El rol **Admin** tiene todos los permisos de Cuentas Virtuales asignados automáticamente al ejecutar el script `101-create-virtual-accounts-schema.sql`.

### Roles Personalizados

Puedes crear roles personalizados y asignarles permisos específicos desde la UI de gestión de roles:

**Ruta:** `/dashboard/roles`

#### Ejemplos de Roles

**1. Operador de Cuentas**
- `VIEW_ACCOUNTS` - Ver cuentas
- `VIEW_ACCOUNT_DETAIL` - Ver detalle
- `VIEW_MOVEMENTS` - Ver movimientos
- `VIEW_LEMONWAY_DATA` - Ver datos Lemonway

**2. Gestor Financiero**
- Todos los permisos de Operador de Cuentas +
- `CREATE_MANUAL_ADJUSTMENT` - Crear ajustes
- `MANAGE_OPERATION_TYPES` - Gestionar tipos de operación

**3. Director Financiero**
- Todos los permisos anteriores +
- `APPROVE_MANUAL_ADJUSTMENT` - Aprobar ajustes
- `LINK_WALLET` - Vincular wallets

## Verificación de Permisos

Para verificar que los permisos están correctamente configurados, ejecuta:

```bash
# Desde el dashboard de SQL o tu cliente PostgreSQL
psql -f scripts/102-verify-virtual-accounts-permissions.sql
```

Esto mostrará:
1. Lista de todos los permisos de Cuentas Virtuales
2. Qué roles tienen permisos de Cuentas Virtuales
3. Si el rol Admin tiene todos los permisos asignados

## APIs Protegidas

Las siguientes APIs verifican permisos antes de permitir acceso:

| Endpoint | Permiso Requerido |
|----------|-------------------|
| `GET /api/admin/virtual-accounts/accounts` | `VIEW_ACCOUNTS` |
| `GET /api/admin/virtual-accounts/accounts/[id]` | `VIEW_ACCOUNT_DETAIL` |
| `GET /api/admin/virtual-accounts/accounts/[id]/movements` | `VIEW_MOVEMENTS` |
| `POST /api/admin/virtual-accounts/accounts/[id]/movements` | `CREATE_MANUAL_ADJUSTMENT` |
| `GET /api/admin/virtual-accounts/operation-types` | `VIEW_ACCOUNTS` |
| `POST /api/admin/virtual-accounts/operation-types` | `MANAGE_OPERATION_TYPES` |
| `PUT /api/admin/virtual-accounts/operation-types/[id]` | `MANAGE_OPERATION_TYPES` |
| `DELETE /api/admin/virtual-accounts/operation-types/[id]` | `MANAGE_OPERATION_TYPES` |

## Sistema de Autorización Centralizado

El sistema de autenticación y autorización está centralizado en `lib/auth/`:

```
lib/auth/
├── index.ts        # Punto de entrada - exporta todas las funciones
├── types.ts        # Tipos TypeScript para roles, permisos y auditoría
├── session.ts      # Gestión de sesiones (getSession, requireAuth)
├── roles.ts        # Verificación de roles (isAdminRole, hasMinRole, etc.)
├── permissions.ts  # Permisos granulares desde BD con caché
├── audit.ts        # Logging de accesos permitidos/denegados
└── middleware.ts   # Helpers para proteger APIs (requireAdmin, requirePermission)
```

## Integración en el Código

Para verificar permisos en nuevas funcionalidades:

```typescript
import { getSession, hasPermission, isAdminRole, logAccess } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: "No autorizado" }, { status: 401 })
  }
  
  // Opción 1: Verificar si es admin (superadmin o admin)
  if (!isAdminRole(session.user.role)) {
    await logAccess({
      userId: session.user.id,
      userEmail: session.user.email,
      userRole: session.user.role,
      resource: 'VIRTUAL_ACCOUNTS',
      action: 'VIEW_ACCOUNTS',
      allowed: false,
      deniedReason: 'No es administrador'
    })
    return Response.json({ error: "Sin permisos suficientes" }, { status: 403 })
  }
  
  // Opción 2: Verificar permiso específico desde la BD
  const canView = await hasPermission(session.user.id, 'VIRTUAL_ACCOUNTS', 'VIEW_ACCOUNTS')
  if (!canView) {
    return Response.json({ error: "Sin permisos suficientes" }, { status: 403 })
  }
  
  // Log de acceso exitoso
  await logAccess({
    userId: session.user.id,
    userEmail: session.user.email,
    userRole: session.user.role,
    resource: 'VIRTUAL_ACCOUNTS',
    action: 'VIEW_ACCOUNTS',
    allowed: true
  })
  
  // Continuar con la lógica...
}
```

### Funciones Disponibles

| Función | Descripción |
|---------|-------------|
| `getSession()` | Obtiene la sesión actual del usuario |
| `requireAuth()` | Verifica autenticación, lanza error si no está autenticado |
| `isAdminRole(role)` | Verifica si el rol es superadmin o admin |
| `isSuperAdmin(role)` | Verifica si el rol es superadmin |
| `hasMinRole(role, minRole)` | Verifica jerarquía de roles |
| `hasPermission(userId, resource, action)` | Verifica permiso específico en BD |
| `checkPermission(role, resource, action)` | Verifica permiso por rol (síncrono) |
| `logAccess(data)` | Registra acceso en tabla AccessLog |
| `requireAdmin(request)` | Middleware que requiere rol admin |
| `requirePermission(permission)` | Middleware que requiere permiso específico |

## Actualización del Sistema de Roles

Si se añaden nuevos permisos en el futuro:

1. Añadir el permiso en la tabla `Permission`
2. Asignarlo a los roles que correspondan en `RolePermission`
3. Actualizar esta documentación
4. Actualizar las verificaciones en las APIs usando `@/lib/auth`
5. Ejecutar script de verificación para confirmar
