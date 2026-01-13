// =====================================================
// TIPOS PARA EL MÓDULO DE EMAILS
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
  status: EmailSendStatus
  gmail_message_id: string | null
  gmail_thread_id: string | null
  error_message: string | null
  error_code: string | null
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  open_count: number
  click_count: number
  metadata: Record<string, unknown>
  created_at: string
  created_by: string | null
  // Campos adicionales para joins
  template_name?: string
}

export type EmailSendStatus = "pending" | "sending" | "sent" | "failed" | "bounced" | "opened" | "clicked"

export interface EmailConfig {
  id: number
  key: string
  value: string | null
  description: string | null
  is_secret: boolean
  created_at: string
  updated_at: string
}

export interface SendEmailRequest {
  to: string
  toName?: string
  templateSlug?: string
  subject?: string
  bodyHtml?: string
  bodyText?: string
  variables?: Record<string, string>
  from?: string
  fromName?: string
  replyTo?: string
  metadata?: Record<string, unknown>
}

export interface EmailStats {
  total: number
  sent: number
  failed: number
  pending: number
  byTemplate: {
    slug: string
    name: string
    count: number
  }[]
  byDay: {
    date: string
    sent: number
    failed: number
  }[]
}
