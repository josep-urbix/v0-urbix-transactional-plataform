import { requireRole, getRolePermissions, clearPermissionCache } from "@/lib/auth"
import { createSQLLogger } from "@/lib/sql-logger"

export async function GET(request: Request) {
  try {
    await requireRole(["admin", "superadmin"])

    const sql = createSQLLogger({
      apiEndpoint: "/api/permissions",
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    })

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")

    if (role) {
      const permissions = await getRolePermissions(role)
      return Response.json({ permissions })
    }

    // Get all permissions
    const permissions = await sql.query(
      `SELECT id, name, description, resource, action FROM "Permission" ORDER BY resource, action`,
      [],
    )

    return Response.json({ permissions })
  } catch (error: any) {
    console.error("List permissions error:", error)
    if (error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(["admin", "superadmin"])

    const { role, permissionId } = await request.json()

    if (!role || !permissionId) {
      return Response.json({ error: "Role and permissionId are required" }, { status: 400 })
    }

    const sql = createSQLLogger({
      apiEndpoint: "/api/permissions",
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    })

    await sql.query(`INSERT INTO "RolePermission" (role, "permissionId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [
      role,
      permissionId,
    ])

    clearPermissionCache()

    return Response.json({ success: true })
  } catch (error: any) {
    console.error("Assign permission error:", error)
    if (error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole(["admin", "superadmin"])

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const permissionId = searchParams.get("permissionId")

    if (!role || !permissionId) {
      return Response.json({ error: "Role and permissionId are required" }, { status: 400 })
    }

    const sql = createSQLLogger({
      apiEndpoint: "/api/permissions",
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    })

    await sql.query(`DELETE FROM "RolePermission" WHERE role = $1 AND "permissionId" = $2`, [role, permissionId])

    clearPermissionCache()

    return Response.json({ success: true })
  } catch (error: any) {
    console.error("Remove permission error:", error)
    if (error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
