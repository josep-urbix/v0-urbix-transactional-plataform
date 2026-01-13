import { sql } from "@/lib/db"

// =====================================================
// TIPOS
// =====================================================

export interface EmailTemplate {
  id: number
  slug: string
  name: string
  description: string | null
  from_email: string
  from_name: string | null
  reply_to: string | null
  subject: string
  body_html: string
  body_text: string | null
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface EmailSend {
  id: number
  template_id: number | null
  template_slug: string | null
  to_email: string
  to_name: string | null
  from_email: string
  from_name: string | null
  reply_to: string | null
  subject: string
  body_html: string | null
  body_text: string | null
  variables_used: Record<string, string>
  status: "pending" | "sending" | "sent" | "failed" | "bounced" | "opened" | "clicked"
  gmail_message_id: string | null
  gmail_thread_id: string | null
  error_message: string | null
  error_code: string | null
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  created_by: string | null
}

export interface SendEmailOptions {
  to: string
  toName?: string
  subject: string
  bodyHtml: string
  bodyText?: string
  from?: string
  fromName?: string
  replyTo?: string
  templateId?: number
  templateSlug?: string
  variables?: Record<string, string>
  metadata?: Record<string, unknown>
  createdBy?: string
}

export interface SendEmailResult {
  success: boolean
  emailSendId: number
  gmailMessageId?: string
  gmailThreadId?: string
  error?: string
}

// =====================================================
// CLIENTE GMAIL CON SERVICE ACCOUNT
// =====================================================

export class GmailClient {
  private accessToken: string | null = null
  private tokenExpiry = 0
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://integrations.urbix.es"
  }

  // =====================================================
  // AUTENTICACIÓN CON SERVICE ACCOUNT
  // =====================================================

  /**
   * Genera un JWT para autenticación con Google
   */
  private async generateJWT(delegatedUserEmail: string): Promise<string> {
    // Obtener credenciales de Service Account desde variables de entorno
    const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL

    if (!clientEmail) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_EMAIL no está configurado. " +
          "Ve a Vercel > Settings > Environment Variables y añade esta variable.",
      )
    }

    if (!rawPrivateKey) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY no está configurado. " +
          "Ve a Vercel > Settings > Environment Variables y añade esta variable.",
      )
    }

    let privateKey = rawPrivateKey.trim()

    // Eliminar comillas si vienen envueltas
    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1)
    }

    // Si viene con \n literales, convertirlos a saltos de línea reales
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n")
    }

    // Debug log para verificar el formato
    console.log("[v0] Private key starts with:", privateKey.substring(0, 50))
    console.log("[v0] Private key ends with:", privateKey.substring(privateKey.length - 50))
    console.log("[v0] Private key length:", privateKey.length)
    console.log("[v0] Delegated user email:", delegatedUserEmail)
    console.log("[v0] Service account email:", clientEmail)

    // Verificar que la clave tiene el formato correcto
    if (!privateKey.includes("-----BEGIN") || !privateKey.includes("PRIVATE KEY-----")) {
      throw new Error(
        "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY tiene un formato inválido. " +
          "Debe comenzar con '-----BEGIN PRIVATE KEY-----' o '-----BEGIN RSA PRIVATE KEY-----'. " +
          "Asegúrate de copiar la clave completa del archivo JSON de la Service Account.",
      )
    }

    const now = Math.floor(Date.now() / 1000)
    const expiry = now + 3600 // 1 hora

    // Header del JWT
    const header = {
      alg: "RS256",
      typ: "JWT",
    }

    // Payload del JWT
    const payload = {
      iss: clientEmail,
      sub: delegatedUserEmail, // Usuario a impersonar
      scope: "https://www.googleapis.com/auth/gmail.send",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: expiry,
    }

    // Codificar header y payload
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))
    const signatureInput = `${encodedHeader}.${encodedPayload}`

    // Firmar con la clave privada
    try {
      console.log("[v0] Attempting to sign JWT...")
      const signature = await this.signWithRSA(signatureInput, privateKey)
      console.log("[v0] JWT signed successfully")
      return `${signatureInput}.${signature}`
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      console.error("[v0] Error signing JWT:", errorMessage)
      console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack")
      throw new Error(
        `Error al firmar el JWT con la clave privada: ${errorMessage}. ` +
          "Verifica que GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY contenga la clave privada completa y válida.",
      )
    }
  }

  /**
   * Codifica en Base64 URL-safe
   */
  private base64UrlEncode(data: string): string {
    const base64 = Buffer.from(data).toString("base64")
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }

  /**
   * Firma datos con RSA-SHA256
   */
  private async signWithRSA(data: string, privateKey: string): Promise<string> {
    const crypto = await import("crypto")
    const sign = crypto.createSign("RSA-SHA256")
    sign.update(data)
    const signature = sign.sign(privateKey, "base64")
    return signature.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  }

  /**
   * Obtiene un access token usando el JWT
   */
  private async getAccessToken(delegatedUserEmail: string): Promise<string> {
    // Verificar si el token actual es válido
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken
    }

    const jwt = await this.generateJWT(delegatedUserEmail)

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Error obteniendo access token: ${error}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = Date.now() + data.expires_in * 1000

    return this.accessToken
  }

  // =====================================================
  // ENVÍO DE EMAILS
  // =====================================================

  /**
   * Envía un email usando Gmail API
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    // Crear registro en email_sends con estado 'pending'
    const [emailSendRecord] = await sql`
      INSERT INTO emails.email_sends (
        template_id, template_slug, to_email, to_name,
        from_email, from_name, reply_to, subject,
        body_html, body_text, variables_used, status,
        metadata, created_by
      ) VALUES (
        ${options.templateId || null},
        ${options.templateSlug || null},
        ${options.to},
        ${options.toName || null},
        ${options.from || "noreply@urbix.es"},
        ${options.fromName || "Urbix"},
        ${options.replyTo || null},
        ${options.subject},
        ${options.bodyHtml},
        ${options.bodyText || null},
        ${JSON.stringify(options.variables || {})}::jsonb,
        'pending',
        ${JSON.stringify(options.metadata || {})}::jsonb,
        ${options.createdBy || null}
      )
      RETURNING id
    `

    const emailSendId = emailSendRecord.id

    try {
      // Actualizar estado a 'sending'
      await sql`
        UPDATE emails.email_sends 
        SET status = 'sending' 
        WHERE id = ${emailSendId}
      `

      // Obtener el email del remitente para la delegación
      const fromEmail = options.from || "noreply@urbix.es"

      // Obtener access token
      const accessToken = await this.getAccessToken(fromEmail)

      const bodyHtmlWithTracking = this.applyTracking(options.bodyHtml, emailSendId)

      // Construir el mensaje en formato RFC 2822
      const message = this.buildRFC2822Message({
        to: options.toName ? `${options.toName} <${options.to}>` : options.to,
        from: options.fromName ? `${options.fromName} <${fromEmail}>` : fromEmail,
        replyTo: options.replyTo,
        subject: options.subject,
        bodyHtml: bodyHtmlWithTracking,
        bodyText: options.bodyText,
      })

      // Codificar mensaje en Base64 URL-safe
      const encodedMessage = this.base64UrlEncode(message)

      // Enviar via Gmail API
      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw: encodedMessage,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || "Error enviando email")
      }

      const result = await response.json()

      // Actualizar registro con éxito
      await sql`
        UPDATE emails.email_sends 
        SET 
          status = 'sent',
          gmail_message_id = ${result.id},
          gmail_thread_id = ${result.threadId},
          sent_at = NOW()
        WHERE id = ${emailSendId}
      `

      return {
        success: true,
        emailSendId,
        gmailMessageId: result.id,
        gmailThreadId: result.threadId,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"

      // Actualizar registro con error
      await sql`
        UPDATE emails.email_sends 
        SET 
          status = 'failed',
          error_message = ${errorMessage},
          error_code = 'SEND_ERROR'
        WHERE id = ${emailSendId}
      `

      return {
        success: false,
        emailSendId,
        error: errorMessage,
      }
    }
  }

  /**
   * Construye un mensaje en formato RFC 2822
   */
  private buildRFC2822Message(options: {
    to: string
    from: string
    replyTo?: string
    subject: string
    bodyHtml: string
    bodyText?: string
  }): string {
    const boundary = `boundary_${Date.now()}`

    let message = ""
    message += `MIME-Version: 1.0\r\n`
    message += `From: ${options.from}\r\n`
    message += `To: ${options.to}\r\n`
    if (options.replyTo) {
      message += `Reply-To: ${options.replyTo}\r\n`
    }
    message += `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString("base64")}?=\r\n`
    message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`
    message += `\r\n`

    // Parte texto plano
    if (options.bodyText) {
      message += `--${boundary}\r\n`
      message += `Content-Type: text/plain; charset="UTF-8"\r\n`
      message += `Content-Transfer-Encoding: base64\r\n`
      message += `\r\n`
      message += `${Buffer.from(options.bodyText).toString("base64")}\r\n`
    }

    // Parte HTML
    message += `--${boundary}\r\n`
    message += `Content-Type: text/html; charset="UTF-8"\r\n`
    message += `Content-Transfer-Encoding: base64\r\n`
    message += `\r\n`
    message += `${Buffer.from(options.bodyHtml).toString("base64")}\r\n`

    message += `--${boundary}--\r\n`

    return message
  }

  // =====================================================
  // TEMPLATES
  // =====================================================

  /**
   * Envía un email usando un template
   */
  async sendWithTemplate(
    templateSlug: string,
    to: string,
    variables: Record<string, string>,
    options?: {
      toName?: string
      metadata?: Record<string, unknown>
      createdBy?: string
    },
  ): Promise<SendEmailResult> {
    // Obtener template
    const [template] = await sql<EmailTemplate[]>`
      SELECT * FROM emails.email_templates 
      WHERE slug = ${templateSlug} AND is_active = true
    `

    if (!template) {
      throw new Error(`Template '${templateSlug}' no encontrado o inactivo`)
    }

    // Reemplazar variables en subject y body
    const subject = this.replaceVariables(template.subject, variables)
    const bodyHtml = this.replaceVariables(template.body_html, variables)
    const bodyText = template.body_text ? this.replaceVariables(template.body_text, variables) : undefined

    // Enviar email
    return this.sendEmail({
      to,
      toName: options?.toName,
      subject,
      bodyHtml,
      bodyText,
      from: template.from_email,
      fromName: template.from_name || undefined,
      replyTo: template.reply_to || undefined,
      templateId: template.id,
      templateSlug: template.slug,
      variables,
      metadata: options?.metadata,
      createdBy: options?.createdBy,
    })
  }

  /**
   * Reemplaza variables {{var}} en un texto
   */
  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? variables[varName] : match
    })
  }

  // =====================================================
  // VERIFICACIÓN DE CONFIGURACIÓN
  // =====================================================

  /**
   * Verifica que la configuración de Gmail esté correcta
   */
  async verifyConfiguration(): Promise<{
    configured: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Verificar variables de entorno
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      errors.push("GOOGLE_SERVICE_ACCOUNT_EMAIL no está configurado")
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      errors.push("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY no está configurado")
    }

    // Verificar que hay al menos un template activo
    const [templateCount] = await sql`
      SELECT COUNT(*) as count FROM emails.email_templates WHERE is_active = true
    `

    if (Number.parseInt(templateCount.count) === 0) {
      warnings.push("No hay templates de email activos")
    }

    return {
      configured: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Inyecta un pixel de seguimiento al final del HTML del email
   */
  private injectTrackingPixel(html: string, emailSendId: number): string {
    const timestamp = Date.now()
    const trackingPixelUrl = `${this.baseUrl}/api/emails/track/${emailSendId}?t=${timestamp}`
    const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" border="0" style="height:1px!important;width:1px!important;border-width:0!important;margin:0!important;padding:0!important;display:block!important;" />`

    console.log("[v0] Injecting tracking pixel:", trackingPixelUrl)

    if (html.toLowerCase().includes("</body>")) {
      return html.replace(/<\/body>/i, `${trackingPixel}</body>`)
    }

    return html + trackingPixel
  }

  /**
   * Reemplaza todos los enlaces del HTML para que pasen por el tracking de clics
   */
  private injectClickTracking(html: string, emailSendId: number): string {
    // Regex para encontrar todos los enlaces href="..."
    const linkRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*)>/gi

    return html.replace(linkRegex, (match, before, url, after) => {
      // No trackear enlaces internos, mailto, tel, o anclas
      if (
        url.startsWith("#") ||
        url.startsWith("mailto:") ||
        url.startsWith("tel:") ||
        url.includes("/api/emails/track/") ||
        url.includes("/api/emails/click/")
      ) {
        return match
      }

      // Crear URL de tracking
      const trackingUrl = `${this.baseUrl}/api/emails/click/${emailSendId}?url=${encodeURIComponent(url)}`
      console.log("[v0] Link tracking:", url, "->", trackingUrl)
      return `<a ${before}href="${trackingUrl}"${after}>`
    })
  }

  /**
   * Aplica tracking de apertura y clics al HTML
   */
  private applyTracking(html: string, emailSendId: number): string {
    let trackedHtml = html

    // 1. Trackear clics en enlaces
    trackedHtml = this.injectClickTracking(trackedHtml, emailSendId)

    // 2. Inyectar pixel de apertura
    trackedHtml = this.injectTrackingPixel(trackedHtml, emailSendId)

    return trackedHtml
  }
}

// Exportar instancia singleton
export const gmailClient = new GmailClient()
