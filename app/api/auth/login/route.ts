import { sql } from "@/lib/db"
import { cookies } from "next/headers"
import * as bcrypt from "bcryptjs"

const loginAttempts = new Map<string, { count: number; timestamp: number }>()
const MAX_ATTEMPTS = 5
const LOCK_TIME = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(email: string): boolean {
  const now = Date.now()
  const attempt = loginAttempts.get(email)

  if (attempt) {
    // Reset if lock time has passed
    if (now - attempt.timestamp > LOCK_TIME) {
      loginAttempts.delete(email)
      return true
    }

    // Check if too many attempts
    if (attempt.count >= MAX_ATTEMPTS) {
      return false
    }
  }

  return true
}

function recordFailedAttempt(email: string) {
  const now = Date.now()
  const attempt = loginAttempts.get(email)

  if (attempt) {
    attempt.count++
    attempt.timestamp = now
  } else {
    loginAttempts.set(email, { count: 1, timestamp: now })
  }
}

function clearAttempts(email: string) {
  loginAttempts.delete(email)
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 })
    }

    if (!checkRateLimit(email)) {
      return Response.json({ error: "Too many failed attempts. Please try again in 15 minutes." }, { status: 429 })
    }

    const users = await sql`
      SELECT id, email, "passwordHash", role 
      FROM "User" 
      WHERE email = ${email}
      LIMIT 1
    `

    if (!users || users.length === 0) {
      recordFailedAttempt(email)
      return Response.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const user = users[0]

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      recordFailedAttempt(email)
      return Response.json({ error: "Invalid email or password" }, { status: 401 })
    }

    clearAttempts(email)

    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2),
    }

    const cookieStore = await cookies()
    cookieStore.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400 * 7,
      path: "/",
    })

    return Response.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
