import { sql } from "@/lib/db"
import { requireRole } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    await requireRole(["admin", "superadmin"])

    const roles = await sql`
      SELECT 
        r.id,
        r.name,
        r."displayName",
        r.description,
        r."isSystem",
        r."createdAt",
        COUNT(rp."permissionId") as "permissionCount"
      FROM "Role" r
      LEFT JOIN "RolePermission" rp ON r.name = rp.role
      GROUP BY r.id, r.name, r."displayName", r.description, r."isSystem", r."createdAt"
      ORDER BY r."isSystem" DESC, r."createdAt" ASC
    `

    return Response.json({ roles })
  } catch (error: any) {
    console.error("List roles error:", error)
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

    const { name, displayName, description } = await request.json()

    if (!name || !displayName) {
      return Response.json({ error: "Name and displayName are required" }, { status: 400 })
    }

    // Validate role name format (lowercase, alphanumeric, underscores)
    if (!/^[a-z0-9_]+$/.test(name)) {
      return Response.json(
        { error: "El nombre del rol solo puede contener letras minúsculas, números y guiones bajos" },
        { status: 400 },
      )
    }

    const result = await sql`
      INSERT INTO "Role" (name, "displayName", description, "isSystem")
      VALUES (${name}, ${displayName}, ${description || null}, false)
      RETURNING id, name, "displayName", description, "isSystem", "createdAt"
    `

    return Response.json({ role: result[0] })
  } catch (error: any) {
    console.error("Create role error:", error)
    if (error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    if (error.code === "23505") {
      return Response.json({ error: "Ya existe un rol con ese nombre" }, { status: 409 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await requireRole(["admin", "superadmin"])

    const { searchParams } = new URL(request.url)
    const roleId = searchParams.get("id")

    if (!roleId) {
      return Response.json({ error: "Role ID is required" }, { status: 400 })
    }

    const { displayName, description } = await request.json()

    if (!displayName) {
      return Response.json({ error: "displayName is required" }, { status: 400 })
    }

    // Check if role exists and is not a system role
    const role = await sql`
      SELECT "isSystem", name FROM "Role" WHERE id = ${roleId}
    `

    if (role.length === 0) {
      return Response.json({ error: "Rol no encontrado" }, { status: 404 })
    }

    if (role[0].isSystem) {
      return Response.json({ error: "No se pueden editar roles del sistema" }, { status: 403 })
    }

    // Update role
    const result = await sql`
      UPDATE "Role" 
      SET "displayName" = ${displayName}, 
          description = ${description || null},
          "updatedAt" = NOW()
      WHERE id = ${roleId}
      RETURNING id, name, "displayName", description, "isSystem", "createdAt", "updatedAt"
    `

    return Response.json({ role: result[0] })
  } catch (error: any) {
    console.error("Update role error:", error)
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
    const roleId = searchParams.get("id")

    if (!roleId) {
      return Response.json({ error: "Role ID is required" }, { status: 400 })
    }

    // Check if role is system role
    const role = await sql`
      SELECT "isSystem", name FROM "Role" WHERE id = ${roleId}
    `

    if (role.length === 0) {
      return Response.json({ error: "Rol no encontrado" }, { status: 404 })
    }

    if (role[0].isSystem) {
      return Response.json({ error: "No se pueden eliminar roles del sistema" }, { status: 403 })
    }

    // Check if role is assigned to any users
    const users = await sql`
      SELECT COUNT(*) as count FROM "User" WHERE role = ${role[0].name}
    `

    if (users[0].count > 0) {
      return Response.json(
        { error: `No se puede eliminar el rol. Hay ${users[0].count} usuario(s) asignado(s)` },
        { status: 409 },
      )
    }

    // Delete role (will cascade delete permissions)
    await sql`
      DELETE FROM "RolePermission" WHERE role = ${role[0].name}
    `

    await sql`
      DELETE FROM "Role" WHERE id = ${roleId}
    `

    return Response.json({ success: true })
  } catch (error: any) {
    console.error("Delete role error:", error)
    if (error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
