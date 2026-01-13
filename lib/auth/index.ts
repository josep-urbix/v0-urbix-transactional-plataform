/**
 * Auth Module - Punto de entrada centralizado para autenticación y autorización
 *
 * SIEMPRE importa desde este archivo, nunca directamente de los submódulos:
 *
 * @example
 * // CORRECTO
 * import { getSession, isAdminRole, hasPermission, logDeniedAccess } from '@/lib/auth'
 *
 * // INCORRECTO - No usar imports desde archivos individuales
 * import { isAdminRole } from '@/lib/auth/roles'
 * import { getSession } from '@/lib/auth.ts'
 */

// Exportar tipos
export * from "./types"

// Exportar funciones de sesión
export { getSession, requireAuth, getServerSession, type Session, type SessionUser } from "./session"

// Exportar funciones de roles
export {
  normalizeRole,
  isValidRole,
  getRoleLevel,
  hasFullAccess,
  isAdminRole,
  hasMinRole,
  hasRole,
  hasHigherRole,
  getRoleDisplayName,
  checkUserRole,
} from "./roles"

// Exportar funciones de permisos
export {
  hasPermission,
  canAccess,
  hasAnyPermission,
  hasAllPermissions,
  getUserPermissions,
  clearPermissionCache,
  // Aliases para compatibilidad
  checkPermission,
  getRolePermissions,
  clearPermissionsCache,
} from "./permissions"

// Exportar funciones de auditoría
export {
  logAccess,
  logAllowedAccess,
  logDeniedAccess,
  getAccessHistory,
  getDeniedAccesses,
  getAccessStats,
} from "./audit"

// Exportar middleware helpers
export { requireAdmin, requireSuperAdmin, requireMinRole, requirePermission, requireRole } from "./middleware"
