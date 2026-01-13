import { sql } from "@/lib/db"
import { requireAuth } from "@/lib/auth"
import { sanitizeError } from "@/lib/api-security"
import * as bcrypt from "bcryptjs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Users can view their own profile, admins can view all
    if (session.user.role !== "admin" && session.user.id !== id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const users = await sql`
      SELECT id, email, name, role, "isActive", "createdAt"
      FROM "User"
      WHERE id = ${id}
    `

    if (users.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    return Response.json({ user: users[0] })
  } catch (error) {
    return Response.json({ error: sanitizeError(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Only admins can update users (except own profile)
    if (session.user.role !== "admin" && session.user.id !== id) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { email, name, role, isActive, password } = body

    const updates: any = {}
    if (email !== undefined) updates.email = email
    if (name !== undefined) updates.name = name
    if (role !== undefined && session.user.role === "admin") updates.role = role
    if (isActive !== undefined && session.user.role === "admin") updates.isActive = isActive
    if (password !== undefined && password !== "") {
      if (password.length < 8) {
        return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 })
      }
      updates.passwordHash = await bcrypt.hash(password, 10)
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "No fields to update" }, { status: 400 })
    }

    let result
    if (updates.passwordHash) {
      // Update with password
      result = await sql`
        UPDATE "User"
        SET 
          email = COALESCE(${updates.email ?? null}, email),
          name = COALESCE(${updates.name ?? null}, name),
          role = COALESCE(${updates.role ?? null}, role),
          "isActive" = COALESCE(${updates.isActive ?? null}, "isActive"),
          "passwordHash" = ${updates.passwordHash}
        WHERE id = ${id}
        RETURNING id, email, name, role, "isActive", "createdAt"
      `
    } else {
      // Update without password
      result = await sql`
        UPDATE "User"
        SET 
          email = COALESCE(${updates.email ?? null}, email),
          name = COALESCE(${updates.name ?? null}, name),
          role = COALESCE(${updates.role ?? null}, role),
          "isActive" = COALESCE(${updates.isActive ?? null}, "isActive")
        WHERE id = ${id}
        RETURNING id, email, name, role, "isActive", "createdAt"
      `
    }

    if (result.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    // Log audit
    await sql`
      INSERT INTO "UserAuditLog" ("userId", action, "changedBy", changes)
      VALUES (${id}, 'USER_UPDATED', ${session.user.id}, ${JSON.stringify(updates)})
    `

    return Response.json({ user: result[0] })
  } catch (error) {
    return Response.json({ error: sanitizeError(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth()
    const { id } = await params

    // Only admins can delete users
    if (session.user.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    // Prevent self-deletion
    if (session.user.id === id) {
      return Response.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM "User"
      WHERE id = ${id}
      RETURNING id, email
    `

    if (result.length === 0) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    // Log audit
    await sql`
      INSERT INTO "UserAuditLog" ("userId", action, "changedBy", changes)
      VALUES (${id}, 'USER_DELETED', ${session.user.id}, ${JSON.stringify({ email: result[0].email })})
    `

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
