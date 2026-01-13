import { NextResponse } from "next/server"
import { gmailClient } from "@/lib/gmail-client"
import type { SendEmailRequest } from "@/lib/types/email"

// POST - Enviar email
export async function POST(request: Request) {
  try {
    const body: SendEmailRequest = await request.json()

    // Validar que hay suficiente información
    if (!body.to) {
      return NextResponse.json({ error: "Se requiere destinatario (to)" }, { status: 400 })
    }

    // Si hay templateSlug, usar template
    if (body.templateSlug) {
      const result = await gmailClient.sendWithTemplate(body.templateSlug, body.to, body.variables || {}, {
        toName: body.toName,
        metadata: body.metadata,
      })

      if (!result.success) {
        return NextResponse.json({ error: result.error, emailSendId: result.emailSendId }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        emailSendId: result.emailSendId,
        gmailMessageId: result.gmailMessageId,
        gmailThreadId: result.gmailThreadId,
      })
    }

    // Envío directo sin template
    if (!body.subject || !body.bodyHtml) {
      return NextResponse.json({ error: "Se requiere subject y bodyHtml para envío sin template" }, { status: 400 })
    }

    const result = await gmailClient.sendEmail({
      to: body.to,
      toName: body.toName,
      subject: body.subject,
      bodyHtml: body.bodyHtml,
      bodyText: body.bodyText,
      from: body.from,
      fromName: body.fromName,
      replyTo: body.replyTo,
      variables: body.variables,
      metadata: body.metadata,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error, emailSendId: result.emailSendId }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      emailSendId: result.emailSendId,
      gmailMessageId: result.gmailMessageId,
      gmailThreadId: result.gmailThreadId,
    })
  } catch (error) {
    console.error("Error enviando email:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al enviar email" },
      { status: 500 },
    )
  }
}
