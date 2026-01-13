/**
 * Auth Middleware Helpers - Funciones helper para proteger rutas y APIs
 *
 * Estas funciones simplifican la verificación de autenticación y autorización
 * en Server Components y API Routes.
 */

import { NextResponse } from "next/server"
import { isAdminRole, hasFullAccess, hasMinRole, hasRole as hasRoleCheck } from "./roles"
import { hasPermission as hasPermissionCheck } from "./permissions"
import { logDeniedAccess, logAllowedAccess } from "./audit"
import type { AuthUser, SystemRole } from "./types"

interface AuthResult {
  success: boolean
  error?: NextResponse
  user?: AuthUser
}

/**
 * Crea una respuesta de error de autorización
 */
function unauthorizedResponse(message = "Sin permisos suficientes"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}

/**
 * Crea una respuesta de error de autenticación
 */
function unauthenticatedResponse(message = "No autenticado"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

/**
 * Verifica que el usuario sea admin (superadmin o admin)
 * Para usar en API Routes
 *
 * @example
 * export async function GET(request: Request) {
 *   const session = await getSession()
 *   const authResult = await requireAdmin(session?.user, 'sql_logs', 'view', request)
 *   if (!authResult.success) return authResult.error
 *
 *   // Continuar con la lógica...
 * }
 */
export async function requireAdmin(
  user: AuthUser | null | undefined,
  resource: string,
  action: string,
  request?: Request,
): Promise<AuthResult> {
  if (!user) {
    await logDeniedAccess(resource, action, "No autenticado", undefined, undefined, undefined, request)
    return { success: false, error: unauthenticatedResponse() }
  }

  if (!isAdminRole(user.role)) {
    await logDeniedAccess(resource, action, "No es admin", user.id, user.email, user.role, request)
    return { success: false, error: unauthorizedResponse() }
  }

  await logAllowedAccess(user.id, user.email, user.role, resource, action, request)
  return { success: true, user }
}

/**
 * Verifica que el usuario sea superadmin
 */
export async function requireSuperAdmin(
  user: AuthUser | null | undefined,
  resource: string,
  action: string,
  request?: Request,
): Promise<AuthResult> {
  if (!user) {
    await logDeniedAccess(resource, action, "No autenticado", undefined, undefined, undefined, request)
    return { success: false, error: unauthenticatedResponse() }
  }

  if (!hasFullAccess(user.role)) {
    await logDeniedAccess(resource, action, "No es superadmin", user.id, user.email, user.role, request)
    return { success: false, error: unauthorizedResponse() }
  }

  await logAllowedAccess(user.id, user.email, user.role, resource, action, request)
  return { success: true, user }
}

/**
 * Verifica que el usuario tenga al menos el rol mínimo requerido
 */
export async function requireMinRole(
  user: AuthUser | null | undefined,
  minRole: SystemRole,
  resource: string,
  action: string,
  request?: Request,
): Promise<AuthResult> {
  if (!user) {
    await logDeniedAccess(resource, action, "No autenticado", undefined, undefined, undefined, request)
    return { success: false, error: unauthenticatedResponse() }
  }

  if (!hasMinRole(user.role, minRole)) {
    await logDeniedAccess(
      resource,
      action,
      `Rol insuficiente (requiere ${minRole})`,
      user.id,
      user.email,
      user.role,
      request,
    )
    return { success: false, error: unauthorizedResponse() }
  }

  await logAllowedAccess(user.id, user.email, user.role, resource, action, request)
  return { success: true, user }
}

/**
 * Verifica que el usuario tenga un permiso específico
 */
export async function requirePermission(
  user: AuthUser | null | undefined,
  permission: string,
  resource: string,
  action: string,
  request?: Request,
): Promise<AuthResult> {
  if (!user) {
    await logDeniedAccess(resource, action, "No autenticado", undefined, undefined, undefined, request)
    return { success: false, error: unauthenticatedResponse() }
  }

  const check = await hasPermissionCheck(user, permission)

  if (!check.allowed) {
    await logDeniedAccess(resource, action, check.reason ?? "Permiso denegado", user.id, user.email, user.role, request)
    return { success: false, error: unauthorizedResponse() }
  }

  await logAllowedAccess(user.id, user.email, user.role, resource, action, request)
  return { success: true, user }
}

/**
 * Verifica que el usuario tenga uno de los roles especificados
 * Mantiene compatibilidad con el antiguo requireRole de auth-middleware.ts
 *
 * @example
 * const authError = await requireRole(['admin', 'superadmin'])
 * if (authError) return authError
 */
export async function requireRole(allowedRoles: SystemRole[]): Promise<NextResponse | null> {
  // Importar getSession aquí para evitar dependencia circular
  const { getSession } = await import("./session")
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  if (!hasRoleCheck(session.user.role, allowedRoles)) {
    return NextResponse.json({ error: "Sin permisos suficientes" }, { status: 403 })
  }

  return null
}
