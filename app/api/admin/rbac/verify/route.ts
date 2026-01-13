import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const issues: string[] = []

    // Verificar permisos de Cuentas Virtuales
    const expectedPermissions = [
      { resource: "VIRTUAL_ACCOUNTS", action: "VIEW" },
      { resource: "VIRTUAL_ACCOUNTS", action: "CREATE" },
      { resource: "VIRTUAL_ACCOUNTS", action: "EDIT" },
      { resource: "VIRTUAL_ACCOUNTS", action: "DELETE" },
      { resource: "VIRTUAL_ACCOUNTS", action: "VIEW_MOVEMENTS" },
      { resource: "VIRTUAL_ACCOUNTS", action: "CREATE_MOVEMENTS" },
      { resource: "VIRTUAL_ACCOUNTS", action: "MANAGE_OPERATION_TYPES" },
    ]

    for (const perm of expectedPermissions) {
      const existing = await sql`
        SELECT id FROM public."Permission"
        WHERE resource = ${perm.resource} AND action = ${perm.action}
      `

      if (existing.length === 0) {
        issues.push(`Permiso faltante: ${perm.resource}.${perm.action}`)
      }
    }

    // Verificar que Admin tenga todos los permisos
    const adminRole = await sql`
      SELECT id FROM public."Role" WHERE name = 'Admin' LIMIT 1
    `

    if (adminRole.length > 0) {
      const roleId = adminRole[0].id
      const allPermissions = await sql`
        SELECT id, resource, action FROM public."Permission"
      `

      for (const perm of allPermissions) {
        const hasPermission = await sql`
          SELECT 1 FROM public."RolePermission"
          WHERE role_id = ${roleId} AND permission_id = ${perm.id}
        `

        if (hasPermission.length === 0) {
          issues.push(`Admin sin permiso: ${perm.resource}.${perm.action}`)
        }
      }
    } else {
      issues.push("Rol Admin no encontrado")
    }

    return NextResponse.json({
      success: issues.length === 0,
      issuesFound: issues.length,
      issues,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[API] Error verificando permisos:", error)
    return NextResponse.json({ error: "Error al verificar permisos", details: error.message }, { status: 500 })
  }
}
