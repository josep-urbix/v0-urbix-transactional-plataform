import type { StepResult, LegacyStepHandler, StepHandlerDefinition } from "./types"
import {
  registerHandler,
  getHandler,
  getLegacyHandler,
  getAllHandlers,
  getRegisteredTypes,
  hasHandler,
  isInitialized,
  markInitialized,
} from "./registry"
import { builtinHandlers } from "./handlers"

// =====================================================
// RE-EXPORT TYPES FOR BACKWARDS COMPATIBILITY
// =====================================================

export type { StepResult }

// =====================================================
// INITIALIZE BUILTIN HANDLERS
// =====================================================

function ensureInitialized(): void {
  if (isInitialized()) return

  console.log("[StepHandlers] Initializing builtin handlers...")

  for (const handler of builtinHandlers) {
    try {
      registerHandler(handler, { force: false, source: "builtin" })
    } catch (error) {
      console.error(`[StepHandlers] Failed to register ${handler.type}:`, error)
    }
  }

  markInitialized()
  console.log(`[StepHandlers] Initialized ${builtinHandlers.length} builtin handlers`)
}

// =====================================================
// PUBLIC API (Backwards Compatible)
// =====================================================

/**
 * Get a step handler by type
 * @deprecated Use getHandler from registry.ts for new code
 */
export function getStepHandler(type: string): LegacyStepHandler | undefined {
  ensureInitialized()
  return getLegacyHandler(type)
}

/**
 * Register a new step handler
 * @deprecated Use registerHandler from registry.ts for new code
 */
export function registerStepHandler(type: string, handler: LegacyStepHandler): void {
  ensureInitialized()

  // Create a wrapper handler definition for legacy handlers
  const { z } = require("zod")

  const wrapperDefinition: StepHandlerDefinition<unknown> = {
    type,
    name: type,
    description: `Legacy handler: ${type}`,
    category: "utility",
    configSchema: z.unknown(),
    defaultConfig: {},
    async execute({ step, context }): Promise<StepResult> {
      return handler(step, context)
    },
  }

  registerHandler(wrapperDefinition, { force: true, source: "custom" })
}

// =====================================================
// NEW API
// =====================================================

/**
 * Get a handler definition by type
 */
export function getHandlerDefinition(type: string): StepHandlerDefinition<unknown> | undefined {
  ensureInitialized()
  return getHandler(type)
}

/**
 * Get all available handler definitions
 */
export function getAllHandlerDefinitions(): StepHandlerDefinition<unknown>[] {
  ensureInitialized()
  return getAllHandlers()
}

/**
 * Get all registered step types
 */
export function getAvailableStepTypes(): string[] {
  ensureInitialized()
  return getRegisteredTypes()
}

/**
 * Check if a step type is supported
 */
export function isStepTypeSupported(type: string): boolean {
  ensureInitialized()
  return hasHandler(type)
}
