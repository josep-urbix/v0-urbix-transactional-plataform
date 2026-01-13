/**
 * Role Management - Sistema centralizado de gestión de roles
 *
 * TODAS las verificaciones de roles DEBEN pasar por este módulo.
 * NUNCA uses comparaciones directas como: role === "admin" || role === "superadmin"
 * SIEMPRE usa: isAdminRole(role) o hasMinRole(role, 'admin')
 */

import { type SystemRole, ROLE_HIERARCHY, FULL_ACCESS_ROLES, ADMIN_ROLES, type AuthUser } from "./types"

/**
 * Normaliza un rol a minúsculas para comparaciones consistentes
 */
export function normalizeRole(role: string | undefined | null): string {
  if (!role) return "user"
  return role.toLowerCase().trim()
}

/**
 * Verifica si el rol es un SystemRole válido
 */
export function isValidRole(role: string | undefined | null): role is SystemRole {
  const normalized = normalizeRole(role)
  return normalized in ROLE_HIERARCHY
}

/**
 * Obtiene el nivel jerárquico de un rol
 */
export function getRoleLevel(role: string | undefined | null): number {
  const normalized = normalizeRole(role)
  return ROLE_HIERARCHY[normalized as SystemRole] ?? ROLE_HIERARCHY.user
}

/**
 * Verifica si un usuario tiene acceso total (superadmin)
 * Los superadmins SIEMPRE tienen acceso a todo, sin excepción
 */
export function hasFullAccess(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  return FULL_ACCESS_ROLES.includes(normalized as SystemRole)
}

/**
 * Verifica si un usuario es admin (superadmin o admin)
 * Esta es la función principal para verificar acceso administrativo
 *
 * @example
 * if (!isAdminRole(session.user.role)) {
 *   redirect('/dashboard')
 * }
 */
export function isAdminRole(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role)
  return ADMIN_ROLES.includes(normalized as SystemRole)
}

/**
 * Verifica si un usuario tiene al menos el rol mínimo requerido
 * Usa la jerarquía de roles para la comparación
 *
 * @example
 * // Verifica si el usuario es al menos supervisor
 * if (!hasMinRole(user.role, 'supervisor')) {
 *   return { error: 'Insufficient permissions' }
 * }
 */
export function hasMinRole(userRole: string | undefined | null, minRole: SystemRole): boolean {
  // Superadmin siempre pasa
  if (hasFullAccess(userRole)) return true

  const userLevel = getRoleLevel(userRole)
  const minLevel = ROLE_HIERARCHY[minRole]

  return userLevel >= minLevel
}

/**
 * Verifica si un usuario tiene exactamente uno de los roles especificados
 */
export function hasRole(userRole: string | undefined | null, allowedRoles: SystemRole[]): boolean {
  // Superadmin siempre pasa
  if (hasFullAccess(userRole)) return true

  const normalized = normalizeRole(userRole)
  return allowedRoles.some((r) => r === normalized)
}

/**
 * Compara dos roles y devuelve si el primero tiene más privilegios
 */
export function hasHigherRole(role1: string | undefined | null, role2: string | undefined | null): boolean {
  return getRoleLevel(role1) > getRoleLevel(role2)
}

/**
 * Obtiene el nombre de visualización de un rol
 */
export function getRoleDisplayName(role: string | undefined | null): string {
  const normalized = normalizeRole(role)
  const displayNames: Record<string, string> = {
    superadmin: "Super Administrador",
    admin: "Administrador",
    supervisor: "Supervisor",
    gestor: "Gestor",
    user: "Usuario",
  }
  return displayNames[normalized] ?? "Usuario"
}

/**
 * Verifica el rol de un AuthUser
 */
export function checkUserRole(user: AuthUser | null | undefined): {
  isAuthenticated: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  role: string
  roleLevel: number
} {
  if (!user) {
    return {
      isAuthenticated: false,
      isAdmin: false,
      isSuperAdmin: false,
      role: "anonymous",
      roleLevel: 0,
    }
  }

  return {
    isAuthenticated: true,
    isAdmin: isAdminRole(user.role),
    isSuperAdmin: hasFullAccess(user.role),
    role: normalizeRole(user.role),
    roleLevel: getRoleLevel(user.role),
  }
}
