/**
 * Session Management - Gestión de sesiones de usuario
 *
 * Este módulo maneja la autenticación basada en cookies.
 */

import { cookies } from "next/headers"

export interface SessionUser {
  id: string
  email: string
  role: string
  name?: string
}

export interface Session {
  user: SessionUser
  expires: string
}

/**
 * Obtiene la sesión actual del usuario desde las cookies
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")

    if (!sessionCookie?.value) {
      return null
    }

    const sessionData = JSON.parse(sessionCookie.value)

    // Verify token isn't expired (7 days expiry)
    const tokenAge = Date.now() - sessionData.timestamp
    const isExpired = tokenAge > 7 * 24 * 60 * 60 * 1000

    if (isExpired) {
      return null
    }

    return {
      user: {
        id: sessionData.userId,
        email: sessionData.email,
        role: sessionData.role,
        name: sessionData.name,
      },
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
  } catch (error) {
    console.error("Session error:", error)
    return null
  }
}

/**
 * Requiere autenticación, lanza error si no hay sesión
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

/**
 * Alias para getSession (compatibilidad)
 */
export async function getServerSession(): Promise<Session | null> {
  return getSession()
}
