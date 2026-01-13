// =====================================================
// WORKFLOW ENGINE TYPES
// =====================================================

export type WorkflowStatus = "ACTIVE" | "INACTIVE"

export type WorkflowRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "WAITING"

export type WorkflowStepRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED" | "WAITING"

export type WorkflowStepType =
  | "CALL_INTERNAL_API"
  | "CALL_WEBHOOK"
  | "SEND_EMAIL"
  | "DELAY"
  | "CONDITIONAL"
  | "SET_VARIABLE"
  | "LOG"

// =====================================================
// DATABASE MODELS
// =====================================================

export interface Workflow {
  id: string
  name: string
  description: string | null
  status: WorkflowStatus
  version: number
  canvas_data: Record<string, unknown>
  entry_step_key: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowWithDetails extends Workflow {
  triggers: WorkflowTrigger[]
  steps: WorkflowStep[]
}

export interface WorkflowTrigger {
  id: string
  workflow_id: string
  event_name: string
  filter_expression: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowStep {
  id: string
  workflow_id: string
  step_key: string
  name: string
  type: WorkflowStepType
  config: StepConfig
  next_step_on_success: string | null
  next_step_on_error: string | null
  max_retries: number
  retry_delay_ms: number
  retry_backoff_multiplier: number
  position_x: number
  position_y: number
  created_at: string
  updated_at: string
}

export interface WorkflowRun {
  id: string
  workflow_id: string
  status: WorkflowRunStatus
  trigger_event_name: string
  trigger_payload: Record<string, unknown>
  context: WorkflowContext
  current_step_key: string | null
  error_message: string | null
  error_stack: string | null
  started_at: string
  finished_at: string | null
  resume_at: string | null
  created_at: string
}

export interface WorkflowRunWithDetails extends WorkflowRun {
  workflow_name?: string
  step_runs: WorkflowStepRun[]
}

export interface WorkflowStepRun {
  id: string
  workflow_run_id: string
  step_id: string
  step_key: string
  status: WorkflowStepRunStatus
  attempt_number: number
  max_attempts: number
  input_data: Record<string, unknown> | null
  output_data: Record<string, unknown> | null
  error_message: string | null
  error_stack: string | null
  is_retriable: boolean
  started_at: string
  finished_at: string | null
  next_retry_at: string | null
  created_at: string
}

export interface WorkflowEvent {
  id: string
  event_name: string
  description: string | null
  payload_schema: Record<string, unknown>
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// =====================================================
// STEP CONFIGURATIONS
// =====================================================

export interface BaseStepConfig {
  description?: string
}

export interface CallInternalApiConfig extends BaseStepConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  urlPath: string
  headersTemplate?: Record<string, string>
  bodyTemplate?: Record<string, unknown> | string
  expectedStatusCodes?: number[]
  outputVariable?: string
}

export interface CallWebhookConfig extends BaseStepConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  url: string
  headersTemplate?: Record<string, string>
  bodyTemplate?: Record<string, unknown> | string
  expectedStatusCodes?: number[]
  outputVariable?: string
  timeoutMs?: number
}

export interface SendEmailConfig extends BaseStepConfig {
  templateKey: string
  toTemplate: string
  ccTemplate?: string
  bccTemplate?: string
  variablesTemplate?: Record<string, string>
}

export interface DelayConfig extends BaseStepConfig {
  delayMs?: number
  delayISO?: string // ISO 8601 duration like "PT1H" for 1 hour
}

export interface ConditionalConfig extends BaseStepConfig {
  conditionExpression: string
  next_step_if_true: string
  next_step_if_false: string
}

export interface SetVariableConfig extends BaseStepConfig {
  variableName: string
  valueTemplate: string | Record<string, unknown>
}

export interface LogConfig extends BaseStepConfig {
  message: string
  level?: "info" | "warn" | "error" | "debug"
}

export type StepConfig =
  | CallInternalApiConfig
  | CallWebhookConfig
  | SendEmailConfig
  | DelayConfig
  | ConditionalConfig
  | SetVariableConfig
  | LogConfig

// =====================================================
// WORKFLOW CONTEXT
// =====================================================

export interface WorkflowContext {
  // Original trigger payload
  trigger: Record<string, unknown>
  // Accumulated step outputs
  steps: Record<string, unknown>
  // Custom variables set during execution
  variables: Record<string, unknown>
  // Metadata
  _meta: {
    workflow_id: string
    workflow_run_id: string
    started_at: string
    current_step?: string
  }
}

// =====================================================
// API TYPES
// =====================================================

export interface CreateWorkflowRequest {
  name: string
  description?: string
  triggers?: Array<{
    event_name: string
    filter_expression?: string
    description?: string
  }>
  steps?: Array<{
    step_key: string
    name: string
    type: WorkflowStepType
    config: StepConfig
    next_step_on_success?: string
    next_step_on_error?: string
    max_retries?: number
    retry_delay_ms?: number
    position_x?: number
    position_y?: number
  }>
  entry_step_key?: string
  canvas_data?: Record<string, unknown>
}

export interface UpdateWorkflowRequest extends Partial<CreateWorkflowRequest> {
  status?: WorkflowStatus
  version?: number
}

export interface EmitEventRequest {
  eventName: string
  payload: Record<string, unknown>
}

export interface WorkflowListFilters {
  status?: WorkflowStatus
  search?: string
  event_name?: string
  limit?: number
  offset?: number
}

export interface WorkflowRunListFilters {
  workflow_id?: string
  status?: WorkflowRunStatus
  event_name?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}
