import { generatePasswordResetToken } from "@/lib/password-reset"
import { secureLog } from "@/lib/security"
import { rateLimit } from "@/lib/rate-limiter"
import { isValidEmail } from "@/lib/security"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return Response.json({ error: "Email es requerido" }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return Response.json({ error: "Formato de email inválido" }, { status: 400 })
    }

    const rateLimitResult = rateLimit(`forgot-password:${email}`, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
    })

    if (!rateLimitResult.allowed) {
      return Response.json({ error: "Demasiados intentos. Por favor intenta de nuevo más tarde." }, { status: 429 })
    }

    const token = await generatePasswordResetToken(email)

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`

    secureLog("Password reset requested", { email })

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // await sendPasswordResetEmail(email, resetUrl)

    return Response.json({
      success: true,
      message: "Si el email existe en nuestro sistema, recibirás un enlace de recuperación",
      // In development, include the token for testing
      ...(process.env.NODE_ENV === "development" && { resetUrl }),
    })
  } catch (error) {
    secureLog("Forgot password error", { error })
    return Response.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
