// =====================================================
// CALL WEBHOOK HANDLER
// Calls external webhooks/APIs
// =====================================================

import { z } from "zod"
import type { StepHandlerDefinition, StepResult } from "../types"
import { processStringTemplate, processObjectTemplate } from "../template-engine"

// =====================================================
// CONFIG SCHEMA
// =====================================================

export const CallWebhookConfigSchema = z.object({
  description: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  url: z.string().url("Must be a valid URL"),
  headersTemplate: z.record(z.string()).optional(),
  bodyTemplate: z.union([z.record(z.unknown()), z.string()]).optional(),
  expectedStatusCodes: z.array(z.number()).optional().default([200, 201, 202, 204]),
  outputVariable: z.string().optional(),
  timeoutMs: z.number().min(1000).max(120000).optional().default(30000),
})

export type CallWebhookConfig = z.infer<typeof CallWebhookConfigSchema>

// =====================================================
// HANDLER DEFINITION
// =====================================================

export const callWebhookHandler: StepHandlerDefinition<CallWebhookConfig> = {
  type: "CALL_WEBHOOK",
  name: "Call Webhook",
  description: "Makes HTTP requests to external webhooks and APIs",
  category: "integration",
  configSchema: CallWebhookConfigSchema,
  defaultConfig: {
    method: "POST",
    url: "https://",
    expectedStatusCodes: [200, 201, 202, 204],
    timeoutMs: 30000,
  },

  async execute({ config, context }): Promise<StepResult> {
    try {
      const url = processStringTemplate(config.url, context)

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Workflow-Run-Id": context._meta.workflow_run_id,
      }

      if (config.headersTemplate) {
        for (const [key, value] of Object.entries(config.headersTemplate)) {
          headers[key] = processStringTemplate(value, context)
        }
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 30000)

      const fetchOptions: RequestInit = {
        method: config.method,
        headers,
        signal: controller.signal,
      }

      if (config.bodyTemplate && ["POST", "PUT", "PATCH"].includes(config.method)) {
        const body = processObjectTemplate(config.bodyTemplate, context)
        fetchOptions.body = JSON.stringify(body)
      }

      const response = await fetch(url, fetchOptions)
      clearTimeout(timeout)

      const expectedCodes = config.expectedStatusCodes || [200, 201, 202, 204]
      if (!expectedCodes.includes(response.status)) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Webhook returned status ${response.status}: ${errorText}`,
          isRetriable: response.status >= 500 || response.status === 429,
        }
      }

      const output: Record<string, unknown> = { status: response.status }
      if (response.status !== 204) {
        try {
          output.data = await response.json()
        } catch {
          output.data = await response.text()
        }
      }

      return { success: true, output }
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === "AbortError"
      return {
        success: false,
        error: isTimeout ? "Request timed out" : error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
        isRetriable: true,
      }
    }
  },
}
