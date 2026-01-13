-- =====================================================
-- WORKFLOW ENGINE SCHEMA
-- Schema: workflows
-- =====================================================

-- Create dedicated schema for workflows
CREATE SCHEMA IF NOT EXISTS workflows;

-- =====================================================
-- WORKFLOWS TABLE
-- Main table for workflow definitions
-- =====================================================
CREATE TABLE IF NOT EXISTS workflows."Workflow" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    version INTEGER NOT NULL DEFAULT 1,
    -- Visual editor metadata (positions, zoom, etc.)
    canvas_data JSONB DEFAULT '{}',
    -- First step to execute
    entry_step_key VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for listing workflows
CREATE INDEX IF NOT EXISTS idx_workflow_status ON workflows."Workflow"(status);
CREATE INDEX IF NOT EXISTS idx_workflow_name ON workflows."Workflow"(name);

-- =====================================================
-- WORKFLOW TRIGGERS TABLE
-- Events that trigger workflow execution
-- =====================================================
CREATE TABLE IF NOT EXISTS workflows."WorkflowTrigger" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows."Workflow"(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    -- Optional filter expression (JSON path or simple expression)
    filter_expression TEXT,
    -- Human readable description
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for finding workflows by event
CREATE INDEX IF NOT EXISTS idx_trigger_event ON workflows."WorkflowTrigger"(event_name);
CREATE INDEX IF NOT EXISTS idx_trigger_workflow ON workflows."WorkflowTrigger"(workflow_id);

-- =====================================================
-- WORKFLOW STEPS TABLE
-- Individual steps/actions in a workflow
-- =====================================================
CREATE TABLE IF NOT EXISTS workflows."WorkflowStep" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows."Workflow"(id) ON DELETE CASCADE,
    -- Unique key within the workflow (e.g., "send_welcome_email")
    step_key VARCHAR(100) NOT NULL,
    -- Human readable name
    name VARCHAR(255) NOT NULL,
    -- Step type
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'CALL_INTERNAL_API',
        'CALL_WEBHOOK', 
        'SEND_EMAIL',
        'DELAY',
        'CONDITIONAL',
        'SET_VARIABLE',
        'LOG'
    )),
    -- Type-specific configuration (JSON)
    config JSONB NOT NULL DEFAULT '{}',
    -- Navigation
    next_step_on_success VARCHAR(100),
    next_step_on_error VARCHAR(100),
    -- Retry configuration
    max_retries INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    retry_backoff_multiplier NUMERIC(3,1) DEFAULT 2.0,
    -- Visual position on canvas
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique step_key per workflow
    CONSTRAINT unique_step_key_per_workflow UNIQUE (workflow_id, step_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_step_workflow ON workflows."WorkflowStep"(workflow_id);
CREATE INDEX IF NOT EXISTS idx_step_type ON workflows."WorkflowStep"(type);

-- =====================================================
-- WORKFLOW RUNS TABLE
-- Execution instances of workflows
-- =====================================================
CREATE TABLE IF NOT EXISTS workflows."WorkflowRun" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows."Workflow"(id) ON DELETE CASCADE,
    -- Execution status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'RUNNING', 
        'COMPLETED',
        'FAILED',
        'CANCELLED',
        'WAITING'
    )),
    -- Trigger information
    trigger_event_name VARCHAR(100) NOT NULL,
    trigger_payload JSONB NOT NULL DEFAULT '{}',
    -- Execution context (accumulated data from steps)
    context JSONB NOT NULL DEFAULT '{}',
    -- Current step being executed
    current_step_key VARCHAR(100),
    -- Error information
    error_message TEXT,
    error_stack TEXT,
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    -- Scheduled resume (for DELAY steps)
    resume_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_run_workflow ON workflows."WorkflowRun"(workflow_id);
CREATE INDEX IF NOT EXISTS idx_run_status ON workflows."WorkflowRun"(status);
CREATE INDEX IF NOT EXISTS idx_run_started ON workflows."WorkflowRun"(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_run_resume ON workflows."WorkflowRun"(resume_at) WHERE resume_at IS NOT NULL;

-- =====================================================
-- WORKFLOW STEP RUNS TABLE
-- Execution history of individual steps
-- =====================================================
CREATE TABLE IF NOT EXISTS workflows."WorkflowStepRun" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_run_id UUID NOT NULL REFERENCES workflows."WorkflowRun"(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES workflows."WorkflowStep"(id) ON DELETE CASCADE,
    step_key VARCHAR(100) NOT NULL,
    -- Execution status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',
        'RUNNING',
        'COMPLETED',
        'FAILED',
        'SKIPPED',
        'WAITING'
    )),
    -- Retry tracking
    attempt_number INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 3,
    -- Input/Output
    input_data JSONB,
    output_data JSONB,
    -- Error information
    error_message TEXT,
    error_stack TEXT,
    is_retriable BOOLEAN DEFAULT TRUE,
    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finished_at TIMESTAMP WITH TIME ZONE,
    -- Next retry time
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_steprun_run ON workflows."WorkflowStepRun"(workflow_run_id);
CREATE INDEX IF NOT EXISTS idx_steprun_step ON workflows."WorkflowStepRun"(step_id);
CREATE INDEX IF NOT EXISTS idx_steprun_status ON workflows."WorkflowStepRun"(status);
CREATE INDEX IF NOT EXISTS idx_steprun_retry ON workflows."WorkflowStepRun"(next_retry_at) WHERE next_retry_at IS NOT NULL;

-- =====================================================
-- WORKFLOW EVENTS TABLE
-- Registry of known event types
-- =====================================================
CREATE TABLE IF NOT EXISTS workflows."WorkflowEvent" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    -- Schema of expected payload (for validation/documentation)
    payload_schema JSONB DEFAULT '{}',
    -- Category for grouping in UI
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SEED DEFAULT EVENTS
-- =====================================================
INSERT INTO workflows."WorkflowEvent" (event_name, description, category) VALUES
    ('USER_REGISTERED', 'Triggered when a new user completes registration', 'users'),
    ('USER_EMAIL_VERIFIED', 'Triggered when user verifies their email address', 'users'),
    ('KYC_SUBMITTED', 'Triggered when user submits KYC documentation', 'kyc'),
    ('KYC_APPROVED', 'Triggered when KYC is approved', 'kyc'),
    ('KYC_REJECTED', 'Triggered when KYC is rejected', 'kyc'),
    ('INVESTMENT_CREATED', 'Triggered when a new investment is created', 'investments'),
    ('INVESTMENT_PAID', 'Triggered when an investment payment is confirmed', 'investments'),
    ('INVESTMENT_CANCELLED', 'Triggered when an investment is cancelled', 'investments'),
    ('PROJECT_CREATED', 'Triggered when a new project is created', 'projects'),
    ('PROJECT_UPDATED', 'Triggered when a project is updated', 'projects'),
    ('PROJECT_FUNDED', 'Triggered when a project reaches funding goal', 'projects'),
    ('WALLET_CREATED', 'Triggered when a wallet is created in Lemonway', 'lemonway'),
    ('WALLET_CREDITED', 'Triggered when funds are added to a wallet', 'lemonway'),
    ('WALLET_DEBITED', 'Triggered when funds are withdrawn from a wallet', 'lemonway'),
    ('TRANSFER_COMPLETED', 'Triggered when a P2P transfer completes', 'lemonway'),
    ('WEBHOOK_RECEIVED', 'Triggered when an external webhook is received', 'webhooks'),
    ('SCHEDULED_TRIGGER', 'Triggered by a scheduled job', 'system'),
    ('MANUAL_TRIGGER', 'Triggered manually by an admin', 'system')
ON CONFLICT (event_name) DO NOTHING;

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION workflows.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workflow_timestamp
    BEFORE UPDATE ON workflows."Workflow"
    FOR EACH ROW
    EXECUTE FUNCTION workflows.update_timestamp();

CREATE TRIGGER update_trigger_timestamp
    BEFORE UPDATE ON workflows."WorkflowTrigger"
    FOR EACH ROW
    EXECUTE FUNCTION workflows.update_timestamp();

CREATE TRIGGER update_step_timestamp
    BEFORE UPDATE ON workflows."WorkflowStep"
    FOR EACH ROW
    EXECUTE FUNCTION workflows.update_timestamp();

CREATE TRIGGER update_event_timestamp
    BEFORE UPDATE ON workflows."WorkflowEvent"
    FOR EACH ROW
    EXECUTE FUNCTION workflows.update_timestamp();

-- =====================================================
-- SAMPLE WORKFLOW (Welcome Email)
-- =====================================================
DO $$
DECLARE
    v_workflow_id UUID;
BEGIN
    -- Create sample workflow
    INSERT INTO workflows."Workflow" (name, description, status, entry_step_key)
    VALUES (
        'Bienvenida Nuevo Usuario',
        'Envía un email de bienvenida cuando un usuario se registra',
        'INACTIVE',
        'send_welcome_email'
    )
    RETURNING id INTO v_workflow_id;
    
    -- Add trigger
    INSERT INTO workflows."WorkflowTrigger" (workflow_id, event_name, description)
    VALUES (v_workflow_id, 'USER_REGISTERED', 'Se activa cuando un usuario completa el registro');
    
    -- Add steps
    INSERT INTO workflows."WorkflowStep" (workflow_id, step_key, name, type, config, position_x, position_y)
    VALUES 
    (v_workflow_id, 'send_welcome_email', 'Enviar Email de Bienvenida', 'SEND_EMAIL', 
     '{"templateKey": "welcome", "toTemplate": "{{context.user.email}}", "variablesTemplate": {"userName": "{{context.user.name}}", "loginUrl": "https://urbix.es/login"}}',
     250, 100),
    (v_workflow_id, 'log_completion', 'Registrar Completado', 'LOG',
     '{"message": "Welcome email sent to {{context.user.email}}"}',
     250, 250);
    
    -- Link steps
    UPDATE workflows."WorkflowStep" 
    SET next_step_on_success = 'log_completion'
    WHERE workflow_id = v_workflow_id AND step_key = 'send_welcome_email';
END;
$$;
