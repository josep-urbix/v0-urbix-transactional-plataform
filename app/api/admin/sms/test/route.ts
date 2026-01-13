import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, requireAdmin } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await getSession()

  const authResult = await requireAdmin(session?.user, "sms", "test", request)
  if (!authResult.success) return authResult.error

  try {
    const body = await request.json()
    const { phone_number, template_key, variables } = body

    if (!phone_number) {
      return NextResponse.json({ error: "El número de teléfono es requerido" }, { status: 400 })
    }

    const configResult = await sql`
      SELECT * FROM public.sms_api_config 
      LIMIT 1
    `

    const config = configResult[0] || {
      test_mode: true,
      provider_name: "test",
      default_sender: "Urbix",
    }

    // Obtener plantilla si se especifica
    let messageBody = "Este es un SMS de prueba desde URBIX."
    let templateName = "Test SMS"

    if (template_key) {
      const templateResult = await sql`
        SELECT * FROM public.sms_templates 
        WHERE key = ${template_key} AND is_active = true
      `

      if (templateResult.length > 0) {
        const template = templateResult[0]
        messageBody = template.body
        templateName = template.name

        // Sustituir variables
        if (variables) {
          Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g")
            messageBody = messageBody.replace(regex, String(value))
          })
        }
      }
    }

    // Si está en modo test o no hay configuración real, simular envío
    if (config.test_mode || !config.access_token) {
      await sql`
        INSERT INTO public.sms_logs (
          template_key,
          to_phone,
          status,
          provider
        ) VALUES (
          ${template_key || "test.manual"},
          ${phone_number},
          'simulated',
          ${config.provider_name || "test"}
        )
      `

      return NextResponse.json({
        success: true,
        simulated: true,
        message: "SMS simulado (modo test activado)",
        details: {
          phone: phone_number,
          body: messageBody,
          segments: Math.ceil(messageBody.length / 160),
        },
      })
    }

    // Enviar SMS real usando el proveedor configurado
    let status = "pending"
    let errorMessage: string | null = null
    let errorCode: string | null = null

    try {
      // Implementación genérica para diferentes proveedores
      if (config.provider_name === "smsapi") {
        const response = await fetch(`${config.base_url}/sms.do`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.access_token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            to: phone_number.replace(/[^0-9+]/g, ""),
            message: messageBody,
            from: config.default_sender || "Urbix",
            format: "json",
          }),
        })

        const providerResponse = await response.json()
        status = response.ok ? "sent" : "failed"
        if (!response.ok) {
          errorMessage = providerResponse.message || "Error from provider"
          errorCode = providerResponse.error || String(response.status)
        }
      } else if (config.provider_name === "twilio") {
        const accountSid = config.access_token.split(":")[0]
        const authToken = config.access_token.split(":")[1]

        const response = await fetch(`${config.base_url}/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: phone_number,
            From: config.default_sender,
            Body: messageBody,
          }),
        })

        const providerResponse = await response.json()
        status = response.ok ? "sent" : "failed"
        if (!response.ok) {
          errorMessage = providerResponse.message || "Error from Twilio"
          errorCode = providerResponse.code || String(response.status)
        }
      } else {
        // Proveedor genérico con Bearer token
        const response = await fetch(`${config.base_url}/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: phone_number,
            message: messageBody,
            sender: config.default_sender || "Urbix",
          }),
        })

        const providerResponse = await response.json()
        status = response.ok ? "sent" : "failed"
        if (!response.ok) {
          errorMessage = providerResponse.message || "Error from provider"
          errorCode = String(response.status)
        }
      }
    } catch (error: any) {
      status = "failed"
      errorMessage = error.message
      errorCode = "NETWORK_ERROR"
    }

    await sql`
      INSERT INTO public.sms_logs (
        template_key,
        to_phone,
        status,
        provider,
        error_code,
        error_message
      ) VALUES (
        ${template_key || "test.manual"},
        ${phone_number},
        ${status},
        ${config.provider_name || "unknown"},
        ${errorCode},
        ${errorMessage}
      )
    `

    return NextResponse.json({
      success: status === "sent",
      simulated: false,
      message: status === "sent" ? "SMS enviado correctamente" : "Error al enviar SMS",
      details: {
        phone: phone_number,
        body: messageBody,
        segments: Math.ceil(messageBody.length / 160),
        status,
        error: errorMessage,
      },
    })
  } catch (error: any) {
    console.error("Error sending test SMS:", error)
    return NextResponse.json(
      {
        error: error.message || "Error al enviar SMS de prueba",
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}
