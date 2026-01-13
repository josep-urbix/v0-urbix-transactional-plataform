import type { NextRequest } from "next/server"
import { validateSession } from "./session"
import type { InvestorUser } from "@/lib/types/investor"

/**
 * Valida la sesión de un inversor desde una NextRequest
 * Busca el token de acceso en cookies o en el header Authorization
 */
export async function validateInvestorSession(request: NextRequest): Promise<InvestorUser | null> {
  try {
    // Intentar obtener token desde cookie
    let accessToken = request.cookies.get("investor_access_token")?.value

    // Si no hay en cookie, intentar desde Authorization header
    if (!accessToken) {
      const authHeader = request.headers.get("authorization")
      if (authHeader?.startsWith("Bearer ")) {
        accessToken = authHeader.substring(7)
      }
    }

    if (!accessToken) {
      return null
    }

    const user = await validateSession(accessToken)
    return user
  } catch (error) {
    console.error("validateInvestorSession error:", error)
    return null
  }
}
