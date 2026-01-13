// =====================================================
// STEP HANDLER TYPES
// Extensible handler system for workflow steps
// =====================================================

import type { z } from "zod"
import type { WorkflowStep, WorkflowContext } from "@/lib/types/workflow"

// =====================================================
// STEP RESULT
// =====================================================

export interface StepResult {
  success: boolean
  output?: Record<string, unknown>
  error?: string
  errorStack?: string
  isRetriable?: boolean
  // For conditional steps - override next step
  nextStepOverride?: string
  // For delay steps - milliseconds to wait
  delayMs?: number
}

// =====================================================
// STEP HANDLER INTERFACE
// Generic interface for all step handlers
// =====================================================

export interface StepHandlerDefinition<TConfig = unknown> {
  /**
   * Unique type identifier (must match WorkflowStepType)
   * Example: "CALL_INTERNAL_API", "SEND_EMAIL", etc.
   */
  type: string

  /**
   * Human-readable name for the handler
   */
  name: string

  /**
   * Description of what this handler does
   */
  description: string

  /**
   * Category for UI grouping
   */
  category: "integration" | "logic" | "communication" | "utility"

  /**
   * Zod schema for validating and typing the config
   * Used to validate config before execution
   */
  configSchema: z.ZodType<TConfig>

  /**
   * Default config values for new steps
   */
  defaultConfig: TConfig

  /**
   * JSON Schema for the config (for UI form generation)
   * Auto-generated from Zod schema if not provided
   */
  configJsonSchema?: Record<string, unknown>

  /**
   * Execute the step with validated config
   */
  execute: (args: StepExecuteArgs<TConfig>) => Promise<StepResult>
}

export interface StepExecuteArgs<TConfig> {
  /** The step definition from the database */
  step: WorkflowStep
  /** The validated and typed config */
  config: TConfig
  /** The workflow execution context */
  context: WorkflowContext
  /** The current workflow run ID */
  runId: string
  /** Current attempt number (1-based) */
  attemptNumber: number
}

// =====================================================
// REGISTRY TYPES
// =====================================================

export interface HandlerRegistryEntry {
  handler: StepHandlerDefinition<unknown>
  registeredAt: Date
  source: "builtin" | "custom"
}

export interface HandlerRegistryStats {
  totalHandlers: number
  builtinHandlers: number
  customHandlers: number
  categories: Record<string, number>
}

// =====================================================
// LEGACY ADAPTER TYPE
// For backwards compatibility with existing code
// =====================================================

export type LegacyStepHandler = (step: WorkflowStep, context: WorkflowContext) => Promise<StepResult>
