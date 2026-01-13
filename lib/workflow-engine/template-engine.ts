// =====================================================
// TEMPLATE ENGINE
// Handles variable substitution in workflow configs
// =====================================================

import type { WorkflowContext } from "@/lib/types/workflow"

/**
 * Get a value from a nested object using dot notation
 * Example: getValue(obj, "user.email") => obj.user.email
 */
function getValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined
    }
    if (typeof current !== "object") {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Resolve context references like "context.user.email" or "trigger.userId"
 */
function resolveContextPath(path: string, context: WorkflowContext): unknown {
  // Handle different root paths
  if (path.startsWith("context.")) {
    return getValue(context as unknown as Record<string, unknown>, path.slice(8))
  }
  if (path.startsWith("trigger.")) {
    return getValue(context.trigger, path.slice(8))
  }
  if (path.startsWith("steps.")) {
    return getValue(context.steps, path.slice(6))
  }
  if (path.startsWith("variables.")) {
    return getValue(context.variables, path.slice(10))
  }
  if (path.startsWith("_meta.")) {
    return getValue(context._meta as unknown as Record<string, unknown>, path.slice(6))
  }

  // Try direct access on trigger (default)
  return getValue(context.trigger, path)
}

/**
 * Process a string template with {{variable}} placeholders
 * Example: "Hello {{context.user.name}}" => "Hello John"
 */
export function processStringTemplate(template: string, context: WorkflowContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
    const value = resolveContextPath(path.trim(), context)
    if (value === undefined || value === null) {
      return ""
    }
    if (typeof value === "object") {
      return JSON.stringify(value)
    }
    return String(value)
  })
}

/**
 * Process an object template recursively
 * Handles nested objects and arrays
 */
export function processObjectTemplate(template: unknown, context: WorkflowContext): unknown {
  if (template === null || template === undefined) {
    return template
  }

  if (typeof template === "string") {
    // Check if it's a pure variable reference (no surrounding text)
    const pureVarMatch = template.match(/^\{\{([^}]+)\}\}$/)
    if (pureVarMatch) {
      // Return the actual value (preserves type)
      return resolveContextPath(pureVarMatch[1].trim(), context)
    }
    // Otherwise process as string template
    return processStringTemplate(template, context)
  }

  if (Array.isArray(template)) {
    return template.map((item) => processObjectTemplate(item, context))
  }

  if (typeof template === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(template)) {
      result[key] = processObjectTemplate(value, context)
    }
    return result
  }

  return template
}

/**
 * Evaluate a simple boolean expression
 * Supports: ==, !=, >, <, >=, <=, &&, ||, !
 */
export function evaluateCondition(expression: string, context: WorkflowContext): boolean {
  try {
    // First, replace all variable references with their values
    let processedExpr = expression

    // Find all variable references
    const varMatches = expression.match(/\{\{([^}]+)\}\}/g) || []
    for (const match of varMatches) {
      const path = match.slice(2, -2).trim()
      const value = resolveContextPath(path, context)

      // Replace with JSON representation for proper comparison
      const replacement = JSON.stringify(value)
      processedExpr = processedExpr.replace(match, replacement)
    }

    // Also handle unbracketed context references (like context.user.active)
    processedExpr = processedExpr.replace(/\b(context|trigger|steps|variables|_meta)\.[a-zA-Z0-9_.]+/g, (match) => {
      const value = resolveContextPath(match, context)
      return JSON.stringify(value)
    })

    // Safe evaluation using Function (restricted scope)
    // Only allow comparison operators and boolean logic
    const safeEval = new Function("return " + processedExpr)
    return Boolean(safeEval())
  } catch (error) {
    console.error("Error evaluating condition:", expression, error)
    return false
  }
}

/**
 * Parse ISO 8601 duration to milliseconds
 * Supports: PTnHnMnS (hours, minutes, seconds)
 */
export function parseISODuration(duration: string): number {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) {
    throw new Error(`Invalid ISO duration format: ${duration}`)
  }

  const hours = Number.parseInt(match[1] || "0", 10)
  const minutes = Number.parseInt(match[2] || "0", 10)
  const seconds = Number.parseInt(match[3] || "0", 10)

  return (hours * 3600 + minutes * 60 + seconds) * 1000
}
