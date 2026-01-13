// =====================================================
// LOG HANDLER
// Logs messages for debugging and observability
// =====================================================

import { z } from "zod"
import { sql } from "@/lib/db"
import type { StepHandlerDefinition, StepResult } from "../types"
import { processStringTemplate } from "../template-engine"

// =====================================================
// CONFIG SCHEMA
// =====================================================

export const LogConfigSchema = z.object({
  description: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  level: z.enum(["info", "warn", "error", "debug"]).optional().default("info"),
})

export type LogConfig = z.infer<typeof LogConfigSchema>

// =====================================================
// HANDLER DEFINITION
// =====================================================

export const logHandler: StepHandlerDefinition<LogConfig> = {
  type: "LOG",
  name: "Log",
  description: "Logs a message for debugging and observability",
  category: "utility",
  configSchema: LogConfigSchema,
  defaultConfig: {
    message: "",
    level: "info",
  },

  async execute({ config, context }): Promise<StepResult> {
    try {
      const message = processStringTemplate(config.message, context)
      const level = config.level || "info"

      // Log to console
      const logFn =
        level === "error"
          ? console.error
          : level === "warn"
            ? console.warn
            : level === "debug"
              ? console.debug
              : console.log

      logFn(`[Workflow ${context._meta.workflow_id}] [Run ${context._meta.workflow_run_id}] ${message}`)

      // Also store in database for observability
      await sql`
        INSERT INTO integrations.lemonway_transactions_log 
        (transaction_type, status, request_data, response_data)
        VALUES (
          'WORKFLOW_LOG',
          'INFO',
          ${JSON.stringify({
            workflow_id: context._meta.workflow_id,
            run_id: context._meta.workflow_run_id,
            step: context._meta.current_step,
            level,
          })}::jsonb,
          ${JSON.stringify({ message })}::jsonb
        )
      `

      return {
        success: true,
        output: { message, level },
      }
    } catch (error) {
      // Log failures should not break the workflow
      return {
        success: true,
        output: {
          message: "Log step completed with errors",
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }
    }
  },
}
