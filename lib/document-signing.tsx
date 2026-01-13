import { sql } from "@/lib/db"
import crypto from "crypto"
import { gmailClient } from "@/lib/gmail-client"
import { put } from "@vercel/blob"

// Validate QR token
export async function validateQRToken(token: string) {
  const result = await sql`
    SELECT 
      ss.id,
      ss.inversor_id,
      ss.document_version_id,
      ss.status,
      ss.qr_token_expires_at,
      ss.expires_at,
      dv.contenido_html,
      dv.version_number,
      dt.display_name as document_name,
      dt.requiere_firma,
      iu.email,
      iu.first_name,
      iu.last_name,
      iu.phone
    FROM documentos.signature_session ss
    JOIN documentos.document_version dv ON ss.document_version_id = dv.id
    JOIN documentos.document_type dt ON dv.document_type_id = dt.id
    JOIN investors."User" iu ON ss.inversor_id = iu.id
    WHERE (ss.qr_token = ${token} OR ss.token_firma = ${token})
      AND ss.status IN ('pendiente', 'otp_enviado')
  `

  if (result.length === 0) {
    return { valid: false, error: "Sesión no encontrada" }
  }

  const session = result[0]
  const expiresAt = session.qr_token_expires_at || session.expires_at

  if (expiresAt && new Date(expiresAt) < new Date()) {
    return { valid: false, error: "Token expirado" }
  }

  return {
    valid: true,
    session: {
      id: session.id,
      inversor_id: session.inversor_id,
      document_version_id: session.document_version_id,
      status: session.status,
      document_name: session.document_name,
      version_number: session.version_number,
      requiere_firma: session.requiere_firma,
      contenido_html: session.contenido_html,
      inversor: {
        email: session.email,
        nombre: `${session.first_name || ""} ${session.last_name || ""}`.trim(),
        first_name: session.first_name,
        last_name: session.last_name,
        phone: session.phone,
      },
    },
  }
}

// Create signature session
export async function createSignatureSession(
  inversor_id: string,
  document_version_id: string,
  options: {
    channel: "desktop" | "mobile"
    ip?: string
    userAgent?: string
    proyecto_id?: string
    inversion_id?: string
  },
) {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  const result = await sql`
    INSERT INTO documentos.signature_session (
      inversor_id,
      document_version_id,
      proyecto_id,
      inversion_id,
      status,
      canal_origen,
      token_firma,
      expires_at,
      created_from_ip,
      user_agent
    ) VALUES (
      ${inversor_id},
      ${document_version_id},
      ${options.proyecto_id || null},
      ${options.inversion_id || null},
      'pendiente',
      ${options.channel}::documentos.firma_channel,
      ${token},
      ${expiresAt.toISOString()},
      ${options.ip || null},
      ${options.userAgent || null}
    )
    RETURNING id, token_firma, expires_at, status
  `

  return {
    id: result[0].id,
    token_firma: result[0].token_firma,
    expires_at: result[0].expires_at,
    status: result[0].status,
  }
}

// Generate QR token
export async function generateQRToken(session_id: string) {
  const qrToken = crypto.randomBytes(32).toString("hex")
  const qrExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

  await sql`
    UPDATE documentos.signature_session
    SET 
      qr_token = ${qrToken},
      qr_token_expires_at = ${qrExpiresAt.toISOString()}
    WHERE id = ${session_id}
  `

  return {
    qrToken,
    expiresAt: qrExpiresAt,
  }
}

// Send OTP
export async function sendOTP(
  session_id: string,
  method: "email" | "sms",
  destination: string,
): Promise<{ sent: boolean; maskedDestination: string }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

  let maskedDestination = ""
  if (method === "email") {
    const parts = destination.split("@")
    maskedDestination = `${parts[0].slice(0, 2)}***@${parts[1]}`
  } else {
    maskedDestination = `***${destination.slice(-4)}`
  }

  await sql`
    UPDATE documentos.signature_session
    SET 
      otp_code = ${code},
      otp_expires_at = ${expiresAt.toISOString()},
      otp_sent_at = NOW(),
      otp_intentos = 0,
      metodo_otp = ${method}::documentos.metodo_otp,
      otp_destino_mascara = ${maskedDestination},
      status = 'otp_enviado'
    WHERE id = ${session_id}
  `

  if (method === "email") {
    try {
      await gmailClient.sendEmail({
        to: destination,
        subject: "Código de verificación para firma de documento",
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Código de Verificación</h2>
            <p>Has solicitado firmar un documento. Usa el siguiente código de verificación:</p>
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
            </div>
            <p>Este código es válido por 10 minutos.</p>
            <p style="color: #6b7280; font-size: 14px;">Si no has solicitado este código, ignora este mensaje.</p>
          </div>
        `,
      })

      return { sent: true, maskedDestination }
    } catch (error) {
      console.error("[SendOTP] Email error:", error)
      return { sent: false, maskedDestination }
    }
  }

  console.log(`[SendOTP] SMS not implemented. Code: ${code}`)
  return { sent: true, maskedDestination }
}

// Verify OTP
export async function verifyOTP(session_id: string, code: string) {
  const result = await sql`
    SELECT otp_code, otp_expires_at, otp_intentos, status
    FROM documentos.signature_session
    WHERE id = ${session_id}
  `

  if (result.length === 0) {
    return { valid: false, error: "Sesión no encontrada" }
  }

  const session = result[0]

  if (session.status !== "otp_enviado") {
    return { valid: false, error: "No hay OTP pendiente" }
  }

  if (session.otp_intentos >= 3) {
    return { valid: false, error: "Demasiados intentos fallidos", remainingAttempts: 0 }
  }

  if (new Date(session.otp_expires_at) < new Date()) {
    return { valid: false, error: "Código expirado" }
  }

  if (session.otp_code !== code) {
    await sql`
      UPDATE documentos.signature_session
      SET otp_intentos = otp_intentos + 1
      WHERE id = ${session_id}
    `

    return {
      valid: false,
      error: "Código incorrecto",
      remainingAttempts: 2 - session.otp_intentos,
    }
  }

  return { valid: true }
}

// Complete signature
export async function completeSignature(
  session_id: string,
  ip: string,
  userAgent: string,
  signature_data_url?: string,
) {
  const sessionResult = await sql`
    SELECT 
      ss.*,
      dv.contenido_html,
      dv.version_number,
      dt.display_name as document_name,
      iu.email,
      iu.first_name,
      iu.last_name
    FROM documentos.signature_session ss
    JOIN documentos.document_version dv ON ss.document_version_id = dv.id
    JOIN documentos.document_type dt ON dv.document_type_id = dt.id
    JOIN investors."User" iu ON ss.inversor_id = iu.id
    WHERE ss.id = ${session_id}
  `

  if (sessionResult.length === 0) {
    throw new Error("Sesión no encontrada")
  }

  const session = sessionResult[0]

  let firma_manuscrita_url = null
  if (signature_data_url) {
    try {
      const base64Data = signature_data_url.replace(/^data:image\/\w+;base64,/, "")
      const buffer = Buffer.from(base64Data, "base64")
      const filename = `signatures/${session_id}-${Date.now()}.png`

      const blob = await put(filename, buffer, {
        access: "public",
        contentType: "image/png",
      })

      firma_manuscrita_url = blob.url
    } catch (error) {
      console.error("[CompleteSignature] Error uploading signature:", error)
    }
  }

  const csv = crypto.randomBytes(16).toString("hex").toUpperCase()

  const signedDocResult = await sql`
    INSERT INTO documentos.signed_document (
      inversor_id,
      document_version_id,
      signature_session_id,
      proyecto_id,
      inversion_id,
      contenido_html_firmado,
      csv,
      status,
      firma_ip,
      firma_user_agent,
      firma_channel,
      metodo_otp_usado,
      otp_destino_mascara,
      firma_completed_at,
      firma_manuscrita_url,
      firma_manuscrita_storage_provider
    ) VALUES (
      ${session.inversor_id},
      ${session.document_version_id},
      ${session_id},
      ${session.proyecto_id || null},
      ${session.inversion_id || null},
      ${session.contenido_html},
      ${csv},
      'firmado',
      ${ip},
      ${userAgent},
      ${session.canal_origen}::documentos.firma_channel,
      ${session.metodo_otp}::documentos.metodo_otp,
      ${session.otp_destino_mascara},
      NOW(),
      ${firma_manuscrita_url},
      ${firma_manuscrita_url ? "vercel_blob" : null}
    )
    RETURNING id, csv, pdf_url, firma_manuscrita_url
  `

  await sql`
    UPDATE documentos.signature_session
    SET 
      status = 'completado',
      completed_at = NOW(),
      signed_from_ip = ${ip}
    WHERE id = ${session_id}
  `

  return {
    id: signedDocResult[0].id,
    csv: signedDocResult[0].csv,
    pdf_url: signedDocResult[0].pdf_url,
    firma_manuscrita_url: signedDocResult[0].firma_manuscrita_url,
  }
}
