// =====================================================
// CALL INTERNAL API HANDLER
// Calls internal APIs within the project
// =====================================================

import { z } from "zod"
import type { StepHandlerDefinition, StepResult } from "../types"
import { processStringTemplate, processObjectTemplate } from "../template-engine"

// =====================================================
// CONFIG SCHEMA
// =====================================================

export const CallInternalApiConfigSchema = z.object({
  description: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]),
  urlPath: z.string().min(1, "URL path is required"),
  headersTemplate: z.record(z.string()).optional(),
  bodyTemplate: z.union([z.record(z.unknown()), z.string()]).optional(),
  expectedStatusCodes: z.array(z.number()).optional().default([200, 201, 204]),
  outputVariable: z.string().optional(),
})

export type CallInternalApiConfig = z.infer<typeof CallInternalApiConfigSchema>

// =====================================================
// HANDLER DEFINITION
// =====================================================

export const callInternalApiHandler: StepHandlerDefinition<CallInternalApiConfig> = {
  type: "CALL_INTERNAL_API",
  name: "Call Internal API",
  description: "Makes HTTP requests to internal APIs within this project",
  category: "integration",
  configSchema: CallInternalApiConfigSchema,
  defaultConfig: {
    method: "GET",
    urlPath: "/api/",
    expectedStatusCodes: [200, 201, 204],
  },

  async execute({ step, config, context }): Promise<StepResult> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      const url = `${baseUrl}${processStringTemplate(config.urlPath, context)}`

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Workflow-Run-Id": context._meta.workflow_run_id,
      }

      if (config.headersTemplate) {
        for (const [key, value] of Object.entries(config.headersTemplate)) {
          headers[key] = processStringTemplate(value, context)
        }
      }

      const fetchOptions: RequestInit = {
        method: config.method,
        headers,
      }

      if (config.bodyTemplate && ["POST", "PUT", "PATCH"].includes(config.method)) {
        const body = processObjectTemplate(config.bodyTemplate, context)
        fetchOptions.body = JSON.stringify(body)
      }

      const response = await fetch(url, fetchOptions)

      const expectedCodes = config.expectedStatusCodes || [200, 201, 204]
      if (!expectedCodes.includes(response.status)) {
        const errorText = await response.text()
        return {
          success: false,
          error: `API returned status ${response.status}: ${errorText}`,
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
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
        isRetriable: true,
      }
    }
  },
}
