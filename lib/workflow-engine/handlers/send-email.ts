// =====================================================
// SEND EMAIL HANDLER
// Sends emails using templates
// =====================================================

import { z } from "zod"
import type { StepHandlerDefinition, StepResult } from "../types"
import { processStringTemplate } from "../template-engine"

// =====================================================
// CONFIG SCHEMA
// =====================================================

export const SendEmailConfigSchema = z.object({
  description: z.string().optional(),
  templateKey: z.string().min(1, "Template key is required"),
  toTemplate: z.string().min(1, "Recipient is required"),
  ccTemplate: z.string().optional(),
  bccTemplate: z.string().optional(),
  variablesTemplate: z.record(z.string()).optional(),
})

export type SendEmailConfig = z.infer<typeof SendEmailConfigSchema>

// =====================================================
// HANDLER DEFINITION
// =====================================================

export const sendEmailHandler: StepHandlerDefinition<SendEmailConfig> = {
  type: "SEND_EMAIL",
  name: "Send Email",
  description: "Sends an email using a predefined template",
  category: "communication",
  configSchema: SendEmailConfigSchema,
  defaultConfig: {
    templateKey: "",
    toTemplate: "{{trigger.email}}",
  },

  async execute({ config, context }): Promise<StepResult> {
    try {
      // Import GmailClient dynamically to avoid circular dependencies
      const { GmailClient } = await import("@/lib/gmail-client")
      const gmail = new GmailClient()

      const to = processStringTemplate(config.toTemplate, context)
      const cc = config.ccTemplate ? processStringTemplate(config.ccTemplate, context) : undefined
      const bcc = config.bccTemplate ? processStringTemplate(config.bccTemplate, context) : undefined

      const variables: Record<string, string> = {}
      if (config.variablesTemplate) {
        for (const [key, value] of Object.entries(config.variablesTemplate)) {
          variables[key] = processStringTemplate(value, context)
        }
      }

      const result = await gmail.sendWithTemplate(config.templateKey, { to, cc, bcc }, variables)

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to send email",
          isRetriable: !result.error?.includes("invalid") && !result.error?.includes("not found"),
        }
      }

      return {
        success: true,
        output: {
          messageId: result.messageId,
          threadId: result.threadId,
          emailSendId: result.emailSendId,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
        isRetriable: true,
      }
    }
  },
}
