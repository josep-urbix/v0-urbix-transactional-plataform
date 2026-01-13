// =====================================================
// STEP HANDLER REGISTRY
// Centralized registry for all workflow step handlers
// =====================================================

import type {
  StepHandlerDefinition,
  HandlerRegistryEntry,
  HandlerRegistryStats,
  LegacyStepHandler,
  StepResult,
} from "./types"
import type { WorkflowStep, WorkflowContext } from "@/lib/types/workflow"

// =====================================================
// PRIVATE REGISTRY STORAGE
// =====================================================

const registry = new Map<string, HandlerRegistryEntry>()

// =====================================================
// REGISTRATION FUNCTIONS
// =====================================================

/**
 * Register a new step handler
 * @throws Error if handler with same type already exists (unless force=true)
 */
export function registerHandler<TConfig>(
  handler: StepHandlerDefinition<TConfig>,
  options: { force?: boolean; source?: "builtin" | "custom" } = {},
): void {
  const { force = false, source = "custom" } = options

  if (registry.has(handler.type) && !force) {
    throw new Error(
      `Handler for type "${handler.type}" is already registered. ` + `Use force=true to override or unregister first.`,
    )
  }

  // Validate that configSchema is a Zod schema
  if (!handler.configSchema || typeof handler.configSchema.parse !== "function") {
    throw new Error(`Handler "${handler.type}" must have a valid Zod configSchema`)
  }

  registry.set(handler.type, {
    handler: handler as StepHandlerDefinition<unknown>,
    registeredAt: new Date(),
    source,
  })

  console.log(`[HandlerRegistry] Registered handler: ${handler.type} (${source})`)
}

/**
 * Unregister a handler by type
 * @returns true if handler was found and removed
 */
export function unregisterHandler(type: string): boolean {
  const existed = registry.has(type)
  registry.delete(type)
  if (existed) {
    console.log(`[HandlerRegistry] Unregistered handler: ${type}`)
  }
  return existed
}

/**
 * Register multiple handlers at once
 */
export function registerHandlers(
  handlers: StepHandlerDefinition<unknown>[],
  options: { force?: boolean; source?: "builtin" | "custom" } = {},
): void {
  for (const handler of handlers) {
    registerHandler(handler, options)
  }
}

// =====================================================
// RETRIEVAL FUNCTIONS
// =====================================================

/**
 * Get a handler by type
 */
export function getHandler(type: string): StepHandlerDefinition<unknown> | undefined {
  return registry.get(type)?.handler
}

/**
 * Get a handler entry with metadata
 */
export function getHandlerEntry(type: string): HandlerRegistryEntry | undefined {
  return registry.get(type)
}

/**
 * Check if a handler is registered
 */
export function hasHandler(type: string): boolean {
  return registry.has(type)
}

/**
 * Get all registered handlers
 */
export function getAllHandlers(): StepHandlerDefinition<unknown>[] {
  return Array.from(registry.values()).map((entry) => entry.handler)
}

/**
 * Get all registered handler types
 */
export function getRegisteredTypes(): string[] {
  return Array.from(registry.keys())
}

/**
 * Get handlers by category
 */
export function getHandlersByCategory(
  category: "integration" | "logic" | "communication" | "utility",
): StepHandlerDefinition<unknown>[] {
  return getAllHandlers().filter((h) => h.category === category)
}

// =====================================================
// STATISTICS
// =====================================================

/**
 * Get registry statistics
 */
export function getRegistryStats(): HandlerRegistryStats {
  const entries = Array.from(registry.values())
  const categories: Record<string, number> = {}

  for (const entry of entries) {
    const cat = entry.handler.category
    categories[cat] = (categories[cat] || 0) + 1
  }

  return {
    totalHandlers: entries.length,
    builtinHandlers: entries.filter((e) => e.source === "builtin").length,
    customHandlers: entries.filter((e) => e.source === "custom").length,
    categories,
  }
}

// =====================================================
// LEGACY ADAPTER
// For backwards compatibility with existing engine code
// =====================================================

/**
 * Get a legacy-style handler function
 * This wraps the new handler interface to work with existing engine code
 */
export function getLegacyHandler(type: string): LegacyStepHandler | undefined {
  const entry = registry.get(type)
  if (!entry) return undefined

  const handler = entry.handler

  // Return a wrapper that adapts the new interface to the legacy signature
  return async (step: WorkflowStep, context: WorkflowContext): Promise<StepResult> => {
    // Validate and parse config using Zod schema
    let config: unknown
    try {
      config = handler.configSchema.parse(step.config)
    } catch (error) {
      return {
        success: false,
        error: `Config validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        isRetriable: false,
      }
    }

    // Execute with the new interface
    return handler.execute({
      step,
      config,
      context,
      runId: context._meta.workflow_run_id,
      attemptNumber: 1, // Will be passed correctly when engine is updated
    })
  }
}

// =====================================================
// INITIALIZATION CHECK
// =====================================================

let initialized = false

/**
 * Check if builtin handlers have been registered
 */
export function isInitialized(): boolean {
  return initialized
}

/**
 * Mark registry as initialized (called after builtin handlers are registered)
 */
export function markInitialized(): void {
  initialized = true
}
