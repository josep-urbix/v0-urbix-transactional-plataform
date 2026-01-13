/**
 * Permission Management - Sistema de permisos granulares
 *
 * Este módulo gestiona permisos específicos por recurso/acción.
 * Usa la tabla Permission y RolePermission de la BD para verificaciones detalladas.
 */

import { sql } from "@/lib/db"
import { hasFullAccess, normalizeRole } from "./roles"
import type { Resource, Action, PermissionCheck, AuthUser } from "./types"

// Tipo para permisos de la BD
interface DBPermission {
  id: string
  name: string
  description: string | null
  resource: string
  action: string
}

// Cache de permisos en memoria (TTL: 5 minutos)
const permissionCache = new Map<
  string,
  { permissions: Set<string>; permissionList: DBPermission[]; expiresAt: number }
>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Genera una clave de cache única para un rol
 */
function getCacheKey(role: string): string {
  return `permissions:${normalizeRole(role)}`
}

/**
 * Limpia el cache de permisos para un rol específico o todos
 */
export function clearPermissionCache(role?: string): void {
  if (role) {
    permissionCache.delete(getCacheKey(role))
  } else {
    permissionCache.clear()
  }
}

/**
 * Alias para compatibilidad con código existente
 */
export const clearPermissionsCache = clearPermissionCache

/**
 * Obtiene los permisos de un rol desde la BD con cache
 */
async function getPermissionsForRole(
  role: string,
): Promise<{ permissions: Set<string>; permissionList: DBPermission[] }> {
  const cacheKey = getCacheKey(role)
  const cached = permissionCache.get(cacheKey)

  // Retornar del cache si está vigente
  if (cached && cached.expiresAt > Date.now()) {
    return { permissions: cached.permissions, permissionList: cached.permissionList }
  }

  try {
    // Consultar permisos desde la BD
    const result = await sql`
      SELECT p.id, p.name, p.description, p.resource, p.action 
      FROM "RolePermission" rp
      JOIN "Permission" p ON rp."permissionId" = p.id
      WHERE LOWER(rp.role) = ${normalizeRole(role)}
    `

    const permissions = new Set<string>()
    const permissionList: DBPermission[] = []

    for (const row of result) {
      const permission: DBPermission = {
        id: row.id,
        name: row.name,
        description: row.description,
        resource: row.resource,
        action: row.action,
      }
      permissionList.push(permission)

      // Añadir permiso por nombre
      if (row.name) permissions.add(row.name.toLowerCase())
      // Añadir permiso por resource:action
      if (row.resource && row.action) {
        permissions.add(`${row.resource.toLowerCase()}:${row.action.toLowerCase()}`)
      }
    }

    // Guardar en cache
    permissionCache.set(cacheKey, {
      permissions,
      permissionList,
      expiresAt: Date.now() + CACHE_TTL,
    })

    return { permissions, permissionList }
  } catch (error) {
    console.error("Error fetching permissions:", error)
    return { permissions: new Set(), permissionList: [] }
  }
}

/**
 * Obtiene la lista de permisos de un rol (para compatibilidad)
 */
export async function getRolePermissions(role: string): Promise<DBPermission[]> {
  const { permissionList } = await getPermissionsForRole(role)
  return permissionList
}

/**
 * Verifica si un usuario tiene un permiso específico
 *
 * @param user - Usuario a verificar
 * @param permission - Permiso requerido (puede ser "resource:action" o nombre directo)
 * @returns PermissionCheck con el resultado
 *
 * @example
 * const check = await hasPermission(user, 'sms:send_test')
 * if (!check.allowed) {
 *   return { error: check.reason }
 * }
 */
export async function hasPermission(user: AuthUser | null | undefined, permission: string): Promise<PermissionCheck> {
  const checkedAt = new Date()

  // Usuario no autenticado
  if (!user) {
    return { allowed: false, reason: "Usuario no autenticado", checkedAt }
  }

  // Superadmin siempre tiene todos los permisos
  if (hasFullAccess(user.role)) {
    return { allowed: true, checkedAt }
  }

  // Obtener permisos del rol
  const { permissions } = await getPermissionsForRole(user.role)
  const normalizedPermission = permission.toLowerCase()

  // Verificar permiso exacto
  if (permissions.has(normalizedPermission)) {
    return { allowed: true, checkedAt }
  }

  // Verificar permiso con wildcard (ej: "bpm:*" permite "bpm:view")
  const [resource] = normalizedPermission.split(":")
  if (permissions.has(`${resource}:*`)) {
    return { allowed: true, checkedAt }
  }

  return {
    allowed: false,
    reason: `Permiso '${permission}' no asignado al rol '${user.role}'`,
    checkedAt,
  }
}

/**
 * Verifica permiso por rol (string) - para compatibilidad con código existente
 */
export async function checkPermission(role: string, resource: string, action: string): Promise<boolean> {
  // Superadmin siempre tiene acceso
  if (hasFullAccess(role)) {
    return true
  }

  const { permissions } = await getPermissionsForRole(role)
  const permissionKey = `${resource.toLowerCase()}:${action.toLowerCase()}`

  return permissions.has(permissionKey) || permissions.has(`${resource.toLowerCase()}:*`)
}

/**
 * Verifica si un usuario puede acceder a un recurso con una acción específica
 *
 * @example
 * const canEdit = await canAccess(user, 'investors', 'edit')
 */
export async function canAccess(
  user: AuthUser | null | undefined,
  resource: Resource,
  action: Action,
): Promise<PermissionCheck> {
  return hasPermission(user, `${resource}:${action}`)
}

/**
 * Verifica múltiples permisos, retorna true si tiene AL MENOS UNO
 */
export async function hasAnyPermission(
  user: AuthUser | null | undefined,
  permissions: string[],
): Promise<PermissionCheck> {
  const checkedAt = new Date()

  if (!user) {
    return { allowed: false, reason: "Usuario no autenticado", checkedAt }
  }

  if (hasFullAccess(user.role)) {
    return { allowed: true, checkedAt }
  }

  for (const permission of permissions) {
    const check = await hasPermission(user, permission)
    if (check.allowed) {
      return { allowed: true, checkedAt }
    }
  }

  return {
    allowed: false,
    reason: `Ninguno de los permisos requeridos está asignado`,
    checkedAt,
  }
}

/**
 * Verifica múltiples permisos, retorna true solo si tiene TODOS
 */
export async function hasAllPermissions(
  user: AuthUser | null | undefined,
  permissions: string[],
): Promise<PermissionCheck> {
  const checkedAt = new Date()

  if (!user) {
    return { allowed: false, reason: "Usuario no autenticado", checkedAt }
  }

  if (hasFullAccess(user.role)) {
    return { allowed: true, checkedAt }
  }

  for (const permission of permissions) {
    const check = await hasPermission(user, permission)
    if (!check.allowed) {
      return {
        allowed: false,
        reason: `Falta el permiso '${permission}'`,
        checkedAt,
      }
    }
  }

  return { allowed: true, checkedAt }
}

/**
 * Obtiene la lista de todos los permisos de un usuario
 */
export async function getUserPermissions(user: AuthUser | null | undefined): Promise<string[]> {
  if (!user) return []

  if (hasFullAccess(user.role)) {
    return ["*"] // Wildcard para indicar acceso total
  }

  const { permissions } = await getPermissionsForRole(user.role)
  return Array.from(permissions)
}
