// =====================================================
// CONDITIONAL HANDLER
// Branches workflow execution based on conditions
// =====================================================

import { z } from "zod"
import type { StepHandlerDefinition, StepResult } from "../types"
import { evaluateCondition } from "../template-engine"

// =====================================================
// CONFIG SCHEMA
// =====================================================

export const ConditionalConfigSchema = z.object({
  description: z.string().optional(),
  conditionExpression: z.string().min(1, "Condition expression is required"),
  next_step_if_true: z.string().min(1, "Next step if true is required"),
  next_step_if_false: z.string().min(1, "Next step if false is required"),
})

export type ConditionalConfig = z.infer<typeof ConditionalConfigSchema>

// =====================================================
// HANDLER DEFINITION
// =====================================================

export const conditionalHandler: StepHandlerDefinition<ConditionalConfig> = {
  type: "CONDITIONAL",
  name: "Conditional",
  description: "Branches workflow execution based on a condition",
  category: "logic",
  configSchema: ConditionalConfigSchema,
  defaultConfig: {
    conditionExpression: "trigger.status === 'approved'",
    next_step_if_true: "",
    next_step_if_false: "",
  },

  async execute({ config, context }): Promise<StepResult> {
    try {
      const result = evaluateCondition(config.conditionExpression, context)

      const nextStep = result ? config.next_step_if_true : config.next_step_if_false

      return {
        success: true,
        output: {
          conditionResult: result,
          nextStep,
          expression: config.conditionExpression,
        },
        nextStepOverride: nextStep,
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to evaluate condition: ${error instanceof Error ? error.message : "Unknown error"}`,
        isRetriable: false,
      }
    }
  },
}
