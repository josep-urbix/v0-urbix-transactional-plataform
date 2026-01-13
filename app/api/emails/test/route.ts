import { NextResponse } from "next/server"
import { gmailClient } from "@/lib/gmail-client"

// POST - Enviar email de prueba
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { to, templateSlug } = body

    if (!to) {
      return NextResponse.json({ error: "Se requiere email de destino (to)" }, { status: 400 })
    }

    // Verificar configuración primero
    const verification = await gmailClient.verifyConfiguration()
    if (!verification.configured) {
      return NextResponse.json(
        {
          error: "Gmail no está configurado correctamente",
          details: verification.errors,
        },
        { status: 400 },
      )
    }

    // Si hay template, usarlo con datos de prueba
    if (templateSlug) {
      const result = await gmailClient.sendWithTemplate(
        templateSlug,
        to,
        {
          user_name: "Usuario de Prueba",
          user_email: to,
          reset_link: "https://urbix.es/reset?token=test123",
          expiry_hours: "24",
          transaction_id: "TEST-001",
          amount: "100.00",
          date: new Date().toLocaleDateString("es-ES"),
          concept: "Prueba de envío",
        },
        {
          metadata: { test: true },
          createdBy: "test-endpoint",
        },
      )

      return NextResponse.json(result)
    }

    // Envío de prueba genérico
    const result = await gmailClient.sendEmail({
      to,
      subject: "Email de prueba - Urbix",
      bodyHtml: `
        <html>
          <body>
            <h1>Email de prueba</h1>
            <p>Este es un email de prueba enviado desde el sistema de emails transaccionales de Urbix.</p>
            <p>Fecha: ${new Date().toLocaleString("es-ES")}</p>
          </body>
        </html>
      `,
      bodyText: `Email de prueba\n\nEste es un email de prueba enviado desde el sistema de emails transaccionales de Urbix.\n\nFecha: ${new Date().toLocaleString("es-ES")}`,
      metadata: { test: true },
      createdBy: "test-endpoint",
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error enviando email de prueba:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al enviar email de prueba" },
      { status: 500 },
    )
  }
}
