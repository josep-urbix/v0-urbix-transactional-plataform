import { sql } from "@/lib/db"
import { generateToken, hashToken, getClientIP } from "./utils"
import { GmailClient } from "@/lib/gmail-client"
import type { MagicLink } from "@/lib/types/investor"

// Crear magic link
export async function createMagicLink(
  email: string,
  purpose: "login" | "register" | "verify_email" | "reset_password" | "link_device",
  request: Request,
  userId?: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(32)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos
  const ip = getClientIP(request)
  const userAgent = request.headers.get("user-agent")

  await sql`
    INSERT INTO investors."MagicLink" (
      user_id, email, token_hash, purpose, expires_at, ip_address, user_agent
    ) VALUES (
      ${userId || null}, ${email}, ${hashToken(token)}, ${purpose},
      ${expiresAt.toISOString()}, ${ip}, ${userAgent}
    )
  `

  return { token, expiresAt }
}

// Verificar magic link
export async function verifyMagicLink(
  token: string,
): Promise<{ valid: boolean; email?: string; userId?: string; purpose?: string; error?: string }> {
  const tokenHash = hashToken(token)

  const result = await sql`
    SELECT * FROM investors."MagicLink"
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > NOW()
  `

  if (result.length === 0) {
    return { valid: false, error: "Token inválido o expirado" }
  }

  const magicLink = result[0] as MagicLink

  // Marcar como usado
  await sql`
    UPDATE investors."MagicLink"
    SET used_at = NOW()
    WHERE token_hash = ${tokenHash}
  `

  return {
    valid: true,
    email: magicLink.email,
    userId: magicLink.user_id || undefined,
    purpose: magicLink.purpose,
  }
}

// Enviar magic link por email
export async function sendMagicLinkEmail(
  email: string,
  token: string,
  purpose: "login" | "register" | "verify_email" | "reset_password" | "link_device",
): Promise<boolean> {
  const baseUrl = "https://integrations.urbix.es/investor-portal"
  const magicLinkUrl = `${baseUrl}/auth/verify?token=${token}&purpose=${purpose}`

  const subjects: Record<string, string> = {
    login: "Accede a tu cuenta de Urbix",
    register: "Completa tu registro en Urbix",
    verify_email: "Verifica tu email en Urbix",
    reset_password: "Restablece tu contraseña de Urbix",
    link_device: "Autoriza un nuevo dispositivo en Urbix",
  }

  const messages: Record<string, string> = {
    login: "Haz clic en el siguiente enlace para acceder a tu cuenta:",
    register: "Haz clic en el siguiente enlace para completar tu registro:",
    verify_email: "Haz clic en el siguiente enlace para verificar tu email:",
    reset_password: "Haz clic en el siguiente enlace para restablecer tu contraseña:",
    link_device: "Haz clic en el siguiente enlace para autorizar este dispositivo:",
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header img { height: 40px; }
        .content { background: #f9fafb; border-radius: 8px; padding: 30px; }
        .button { display: inline-block; background: #000; color: #fff; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        .warning { background: #fef3c7; border-radius: 6px; padding: 12px; margin-top: 20px; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="color: #000;">Urbix</h1>
        </div>
        <div class="content">
          <h2>${subjects[purpose]}</h2>
          <p>${messages[purpose]}</p>
          <p style="text-align: center;">
            <a href="${magicLinkUrl}" class="button">Acceder</a>
          </p>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; font-size: 13px; color: #666;">${magicLinkUrl}</p>
          <div class="warning">
            <strong>Importante:</strong> Este enlace expira en 15 minutos y solo puede usarse una vez.
            Si no solicitaste este email, puedes ignorarlo.
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Urbix. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const gmail = new GmailClient()
    await gmail.sendEmail({
      to: email,
      subject: subjects[purpose],
      html: htmlContent,
      text: `${messages[purpose]}\n\n${magicLinkUrl}\n\nEste enlace expira en 15 minutos.`,
    })
    return true
  } catch (error) {
    console.error("Error enviando magic link:", error)
    return false
  }
}
