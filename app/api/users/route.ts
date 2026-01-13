import { getSession, isAdminRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/api-security"
import * as bcrypt from "bcryptjs"
import { createSQLLogger } from "@/lib/sql-logger"

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminRole(session.user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const sql = createSQLLogger({
      apiEndpoint: "/api/users",
      userEmail: session.user.email,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    })

    const users = await sql.query(
      `SELECT id, email, name, role, "isActive", "createdAt" FROM "User" ORDER BY "createdAt" DESC`,
      [],
    )

    return Response.json({ users })
  } catch (error: any) {
    console.error("Users API error:", error.message)
    return Response.json({ error: sanitizeError(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminRole(session.user.role)) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const { email, name, password, role } = await request.json()

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return Response.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Validate role
    if (role && !["admin", "user"].includes(role)) {
      return Response.json({ error: "Invalid role" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 })
    }

    const sql = createSQLLogger({
      apiEndpoint: "/api/users",
      userEmail: session.user.email,
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    })

    // Check if user already exists
    const existing = await sql.query(`SELECT id FROM "User" WHERE email = $1`, [email])

    if (existing.length > 0) {
      return Response.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const result = await sql.query(
      `INSERT INTO "User" (email, name, "passwordHash", role, "isActive") VALUES ($1, $2, $3, $4, true) RETURNING id, email, name, role, "isActive", "createdAt"`,
      [email, name || null, passwordHash, role || "user"],
    )

    // Log audit
    await sql.query(
      `INSERT INTO "UserAuditLog" ("userId", action, "changedBy", changes) VALUES ($1, 'USER_CREATED', $2, $3)`,
      [result[0].id, session.user.id, JSON.stringify({ email, name, role: role || "user" })],
    )

    return Response.json({ user: result[0] }, { status: 201 })
  } catch (error: any) {
    console.error("Users API POST error:", error.message)
    return Response.json({ error: sanitizeError(error) }, { status: 500 })
  }
}
