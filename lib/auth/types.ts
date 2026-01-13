/**
 * Auth Types - Sistema centralizado de tipos para autenticación y autorización
 *
 * Este archivo define todos los tipos relacionados con el sistema de roles y permisos.
 * NUNCA definas tipos de roles/permisos fuera de este archivo.
 */

// Roles del sistema - sincronizados con la tabla Role en BD
export type SystemRole = "superadmin" | "admin" | "supervisor" | "gestor" | "user"

// Jerarquía de roles (mayor número = más privilegios)
export const ROLE_HIERARCHY: Record<SystemRole, number> = {
  superadmin: 100,
  admin: 80,
  supervisor: 60,
  gestor: 40,
  user: 20,
} as const

// Roles que tienen acceso administrativo completo
export const FULL_ACCESS_ROLES: SystemRole[] = ["superadmin"] as const

// Roles que tienen acceso administrativo
export const ADMIN_ROLES: SystemRole[] = ["superadmin", "admin"] as const

// Recursos del sistema
export type Resource =
  | "dashboard"
  | "investors"
  | "documents"
  | "tasks"
  | "virtual_accounts"
  | "hubspot"
  | "lemonway"
  | "gmail"
  | "sms"
  | "bpm"
  | "wallets"
  | "sql_logs"
  | "settings"
  | "users"
  | "roles"
  | "audit"

// Acciones posibles
export type Action = "view" | "create" | "edit" | "delete" | "execute" | "manage" | "export" | "import"

// Resultado de verificación de permiso
export interface PermissionCheck {
  allowed: boolean
  reason?: string
  checkedAt: Date
}

// Usuario para verificación de permisos
export interface AuthUser {
  id: string
  email: string
  role: string
  name?: string
}

// Log de acceso
export interface AccessLogEntry {
  userId?: string
  userEmail?: string
  userRole?: string
  resource: string
  action: string
  allowed: boolean
  deniedReason?: string
  ipAddress?: string
  userAgent?: string
  requestPath?: string
  requestMethod?: string
  metadata?: Record<string, unknown>
}
