// =====================================================
// WORKFLOW ENGINE
// Core execution logic for workflows
// =====================================================

import { sql } from "@/lib/db"
import type {
  WorkflowStep,
  WorkflowRun,
  WorkflowStepRun,
  WorkflowContext,
  WorkflowStepRunStatus,
} from "@/lib/types/workflow"
import { getHandlerDefinition, getStepHandler, type StepResult } from "./step-handlers"

// =====================================================
// EMIT EVENT - Main entry point to trigger workflows
// =====================================================
export async function emitEvent(
  eventName: string,
  payload: Record<string, unknown>,
): Promise<{ triggered: number; runIds: string[] }> {
  console.log(`[WorkflowEngine] Emitting event: ${eventName}`)

  // Find all active workflows with matching triggers
  const triggers = await sql`
    SELECT 
      t.id as trigger_id,
      t.workflow_id,
      t.filter_expression,
      w.name as workflow_name,
      w.entry_step_key
    FROM workflows."WorkflowTrigger" t
    JOIN workflows."Workflow" w ON w.id = t.workflow_id
    WHERE t.event_name = ${eventName}
      AND t.is_active = true
      AND w.status = 'ACTIVE'
  `

  if (triggers.length === 0) {
    console.log(`[WorkflowEngine] No active workflows for event: ${eventName}`)
    return { triggered: 0, runIds: [] }
  }

  const runIds: string[] = []

  for (const trigger of triggers) {
    // Check filter expression if present
    if (trigger.filter_expression) {
      try {
        const { evaluateCondition } = await import("./template-engine")
        const tempContext: WorkflowContext = {
          trigger: payload,
          steps: {},
          variables: {},
          _meta: {
            workflow_id: trigger.workflow_id,
            workflow_run_id: "",
            started_at: new Date().toISOString(),
          },
        }

        if (!evaluateCondition(trigger.filter_expression, tempContext)) {
          console.log(`[WorkflowEngine] Filter expression not matched for workflow: ${trigger.workflow_name}`)
          continue
        }
      } catch (error) {
        console.error(`[WorkflowEngine] Error evaluating filter:`, error)
        continue
      }
    }

    // Create workflow run
    const runId = await createWorkflowRun(trigger.workflow_id, eventName, payload, trigger.entry_step_key)

    runIds.push(runId)

    // Start execution (async, don't await)
    executeWorkflowRun(runId).catch((error) => {
      console.error(`[WorkflowEngine] Error executing workflow run ${runId}:`, error)
    })
  }

  console.log(`[WorkflowEngine] Triggered ${runIds.length} workflow(s)`)
  return { triggered: runIds.length, runIds }
}

// =====================================================
// CREATE WORKFLOW RUN
// =====================================================
async function createWorkflowRun(
  workflowId: string,
  eventName: string,
  payload: Record<string, unknown>,
  entryStepKey: string | null,
): Promise<string> {
  const context: WorkflowContext = {
    trigger: payload,
    steps: {},
    variables: {},
    _meta: {
      workflow_id: workflowId,
      workflow_run_id: "", // Will be set after insert
      started_at: new Date().toISOString(),
    },
  }

  const result = await sql`
    INSERT INTO workflows."WorkflowRun" (
      workflow_id,
      status,
      trigger_event_name,
      trigger_payload,
      context,
      current_step_key
    ) VALUES (
      ${workflowId},
      'PENDING',
      ${eventName},
      ${JSON.stringify(payload)}::jsonb,
      ${JSON.stringify(context)}::jsonb,
      ${entryStepKey}
    )
    RETURNING id
  `

  const runId = result[0].id

  // Update context with run ID
  context._meta.workflow_run_id = runId
  await sql`
    UPDATE workflows."WorkflowRun"
    SET context = ${JSON.stringify(context)}::jsonb
    WHERE id = ${runId}
  `

  return runId
}

// =====================================================
// EXECUTE WORKFLOW RUN
// =====================================================
export async function executeWorkflowRun(runId: string): Promise<void> {
  console.log(`[WorkflowEngine] Starting execution of run: ${runId}`)

  // Get run details
  const runs = await sql`
    SELECT * FROM workflows."WorkflowRun"
    WHERE id = ${runId}
  `

  if (runs.length === 0) {
    throw new Error(`Workflow run not found: ${runId}`)
  }

  const run = runs[0] as WorkflowRun

  // Check if already completed or cancelled
  if (["COMPLETED", "FAILED", "CANCELLED"].includes(run.status)) {
    console.log(`[WorkflowEngine] Run ${runId} already in terminal state: ${run.status}`)
    return
  }

  // Update status to RUNNING
  await sql`
    UPDATE workflows."WorkflowRun"
    SET status = 'RUNNING', started_at = NOW()
    WHERE id = ${runId}
  `

  // Get workflow steps
  const steps = await sql`
    SELECT * FROM workflows."WorkflowStep"
    WHERE workflow_id = ${run.workflow_id}
  `

  const stepsMap = new Map<string, WorkflowStep>()
  for (const step of steps) {
    stepsMap.set(step.step_key, step as WorkflowStep)
  }

  // Execute steps starting from current_step_key
  let currentStepKey = run.current_step_key
  const context = run.context as WorkflowContext

  while (currentStepKey) {
    const step = stepsMap.get(currentStepKey)
    if (!step) {
      await failWorkflowRun(runId, `Step not found: ${currentStepKey}`)
      return
    }

    // Update current step in context
    context._meta.current_step = currentStepKey

    // Execute step
    const result = await executeStep(runId, step, context)

    if (!result.success) {
      // Check if we should retry
      const stepRun = await getLatestStepRun(runId, step.id)
      if (stepRun && stepRun.attempt_number < step.max_retries && result.isRetriable) {
        // Schedule retry
        const delay = step.retry_delay_ms * Math.pow(step.retry_backoff_multiplier, stepRun.attempt_number - 1)
        await scheduleStepRetry(runId, step, delay)
        return
      }

      // Check for error path
      if (step.next_step_on_error) {
        currentStepKey = step.next_step_on_error
        continue
      }

      // Fail the workflow
      await failWorkflowRun(runId, result.error || "Step failed")
      return
    }

    // Handle delay steps that need scheduling
    if (result.delayMs && result.delayMs >= 30000) {
      await scheduleDelayResume(runId, step.next_step_on_success, result.delayMs)
      return
    }

    // Store step output in context
    if (result.output) {
      context.steps[currentStepKey] = result.output
    }

    // Update context in database
    await sql`
      UPDATE workflows."WorkflowRun"
      SET context = ${JSON.stringify(context)}::jsonb
      WHERE id = ${runId}
    `

    // Determine next step
    currentStepKey = result.nextStepOverride || step.next_step_on_success || null

    // Update current step
    await sql`
      UPDATE workflows."WorkflowRun"
      SET current_step_key = ${currentStepKey}
      WHERE id = ${runId}
    `
  }

  // Workflow completed successfully
  await completeWorkflowRun(runId)
}

// =====================================================
// EXECUTE SINGLE STEP
// =====================================================
async function executeStep(runId: string, step: WorkflowStep, context: WorkflowContext): Promise<StepResult> {
  console.log(`[WorkflowEngine] Executing step: ${step.step_key} (${step.type})`)

  // Get or create step run record
  const existingRuns = await sql`
    SELECT * FROM workflows."WorkflowStepRun"
    WHERE workflow_run_id = ${runId} AND step_id = ${step.id}
    ORDER BY attempt_number DESC
    LIMIT 1
  `

  let attemptNumber = 1
  if (existingRuns.length > 0) {
    attemptNumber = existingRuns[0].attempt_number + 1
  }

  // Create step run record
  const stepRunResult = await sql`
    INSERT INTO workflows."WorkflowStepRun" (
      workflow_run_id,
      step_id,
      step_key,
      status,
      attempt_number,
      max_attempts,
      input_data
    ) VALUES (
      ${runId},
      ${step.id},
      ${step.step_key},
      'RUNNING',
      ${attemptNumber},
      ${step.max_retries},
      ${JSON.stringify({ context: context.trigger, variables: context.variables })}::jsonb
    )
    RETURNING id
  `

  const stepRunId = stepRunResult[0].id

  const handlerDef = getHandlerDefinition(step.type)

  if (handlerDef) {
    // Use new handler system with config validation
    try {
      // Validate config using Zod schema
      let validatedConfig: unknown
      try {
        validatedConfig = handlerDef.configSchema.parse(step.config)
      } catch (validationError) {
        const error = `Config validation failed for ${step.type}: ${validationError instanceof Error ? validationError.message : "Unknown error"}`
        await updateStepRun(stepRunId, "FAILED", null, error, false)
        return { success: false, error, isRetriable: false }
      }

      // Execute with validated config
      const result = await handlerDef.execute({
        step,
        config: validatedConfig,
        context,
        runId,
        attemptNumber,
      })

      if (result.success) {
        await updateStepRun(stepRunId, "COMPLETED", result.output)
      } else {
        await updateStepRun(
          stepRunId,
          "FAILED",
          result.output,
          result.error,
          result.isRetriable ?? true,
          result.errorStack,
        )
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      const errorStack = error instanceof Error ? error.stack : undefined
      await updateStepRun(stepRunId, "FAILED", null, errorMessage, true, errorStack)
      return { success: false, error: errorMessage, errorStack, isRetriable: true }
    }
  }

  // Fall back to legacy handler if no new handler found
  const legacyHandler = getStepHandler(step.type)
  if (!legacyHandler) {
    const error = `No handler found for step type: ${step.type}`
    await updateStepRun(stepRunId, "FAILED", null, error, false)
    return { success: false, error, isRetriable: false }
  }

  try {
    const result = await legacyHandler(step, context)

    if (result.success) {
      await updateStepRun(stepRunId, "COMPLETED", result.output)
    } else {
      await updateStepRun(
        stepRunId,
        "FAILED",
        result.output,
        result.error,
        result.isRetriable ?? true,
        result.errorStack,
      )
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : undefined
    await updateStepRun(stepRunId, "FAILED", null, errorMessage, true, errorStack)
    return { success: false, error: errorMessage, errorStack, isRetriable: true }
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function updateStepRun(
  stepRunId: string,
  status: WorkflowStepRunStatus,
  output?: Record<string, unknown> | null,
  error?: string,
  isRetriable?: boolean,
  errorStack?: string,
): Promise<void> {
  await sql`
    UPDATE workflows."WorkflowStepRun"
    SET 
      status = ${status},
      output_data = ${output ? JSON.stringify(output) : null}::jsonb,
      error_message = ${error || null},
      error_stack = ${errorStack || null},
      is_retriable = ${isRetriable ?? true},
      finished_at = NOW()
    WHERE id = ${stepRunId}
  `
}

async function getLatestStepRun(runId: string, stepId: string): Promise<WorkflowStepRun | null> {
  const result = await sql`
    SELECT * FROM workflows."WorkflowStepRun"
    WHERE workflow_run_id = ${runId} AND step_id = ${stepId}
    ORDER BY attempt_number DESC
    LIMIT 1
  `
  return result.length > 0 ? (result[0] as WorkflowStepRun) : null
}

async function scheduleStepRetry(runId: string, step: WorkflowStep, delayMs: number): Promise<void> {
  const resumeAt = new Date(Date.now() + delayMs)

  await sql`
    UPDATE workflows."WorkflowRun"
    SET 
      status = 'WAITING',
      resume_at = ${resumeAt.toISOString()}
    WHERE id = ${runId}
  `

  console.log(`[WorkflowEngine] Scheduled retry for run ${runId} at ${resumeAt.toISOString()}`)
}

async function scheduleDelayResume(runId: string, nextStepKey: string | null, delayMs: number): Promise<void> {
  const resumeAt = new Date(Date.now() + delayMs)

  await sql`
    UPDATE workflows."WorkflowRun"
    SET 
      status = 'WAITING',
      current_step_key = ${nextStepKey},
      resume_at = ${resumeAt.toISOString()}
    WHERE id = ${runId}
  `

  console.log(`[WorkflowEngine] Scheduled delay resume for run ${runId} at ${resumeAt.toISOString()}`)
}

async function failWorkflowRun(runId: string, error: string): Promise<void> {
  await sql`
    UPDATE workflows."WorkflowRun"
    SET 
      status = 'FAILED',
      error_message = ${error},
      finished_at = NOW()
    WHERE id = ${runId}
  `
  console.log(`[WorkflowEngine] Workflow run ${runId} failed: ${error}`)
}

async function completeWorkflowRun(runId: string): Promise<void> {
  await sql`
    UPDATE workflows."WorkflowRun"
    SET 
      status = 'COMPLETED',
      finished_at = NOW()
    WHERE id = ${runId}
  `
  console.log(`[WorkflowEngine] Workflow run ${runId} completed successfully`)
}

// =====================================================
// RESUME WAITING WORKFLOWS (called by cron)
// =====================================================
export async function resumeWaitingWorkflows(): Promise<number> {
  const waitingRuns = await sql`
    SELECT id FROM workflows."WorkflowRun"
    WHERE status = 'WAITING'
      AND resume_at <= NOW()
    LIMIT 10
  `

  for (const run of waitingRuns) {
    executeWorkflowRun(run.id).catch((error) => {
      console.error(`[WorkflowEngine] Error resuming workflow ${run.id}:`, error)
    })
  }

  return waitingRuns.length
}

// =====================================================
// CANCEL WORKFLOW RUN
// =====================================================
export async function cancelWorkflowRun(runId: string): Promise<void> {
  await sql`
    UPDATE workflows."WorkflowRun"
    SET 
      status = 'CANCELLED',
      finished_at = NOW()
    WHERE id = ${runId}
      AND status NOT IN ('COMPLETED', 'FAILED', 'CANCELLED')
  `
}
