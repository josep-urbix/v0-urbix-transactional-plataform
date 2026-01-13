// =====================================================
// SET VARIABLE HANDLER
// Sets a variable in the workflow context
// =====================================================

import { z } from "zod"
import type { StepHandlerDefinition, StepResult } from "../types"
import { processObjectTemplate } from "../template-engine"

// =====================================================
// CONFIG SCHEMA
// =====================================================

export const SetVariableConfigSchema = z.object({
  description: z.string().optional(),
  variableName: z.string().min(1, "Variable name is required"),
  valueTemplate: z.union([z.string(), z.record(z.unknown())]),
})

export type SetVariableConfig = z.infer<typeof SetVariableConfigSchema>

// =====================================================
// HANDLER DEFINITION
// =====================================================

export const setVariableHandler: StepHandlerDefinition<SetVariableConfig> = {
  type: "SET_VARIABLE",
  name: "Set Variable",
  description: "Sets a variable in the workflow context for use in later steps",
  category: "utility",
  configSchema: SetVariableConfigSchema,
  defaultConfig: {
    variableName: "myVariable",
    valueTemplate: "",
  },

  async execute({ config, context }): Promise<StepResult> {
    try {
      const value = processObjectTemplate(config.valueTemplate, context)

      // Update context variables (will be persisted by engine)
      context.variables[config.variableName] = value

      return {
        success: true,
        output: {
          variableName: config.variableName,
          value,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        isRetriable: false,
      }
    }
  },
}
