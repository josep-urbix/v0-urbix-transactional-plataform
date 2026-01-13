-- OPCIÓN 2: Create tables for Lemonway centralized admin panel with dual FIFO queue

-- 1. Lemonway Request Queue (Dual FIFO: URGENT + NORMAL)
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_request_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('URGENT', 'NORMAL')),
  queue_position INTEGER NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  wallet_id VARCHAR(255),
  account_id VARCHAR(255),
  operation_type VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  sandbox_mode BOOLEAN DEFAULT FALSE,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by_admin_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_queue_position_per_priority UNIQUE (priority, queue_position)
);

CREATE INDEX idx_queue_priority_status ON lemonway_temp.lemonway_request_queue(priority, status);
CREATE INDEX idx_queue_status ON lemonway_temp.lemonway_request_queue(status);
CREATE INDEX idx_queue_created_at ON lemonway_temp.lemonway_request_queue(created_at DESC);
CREATE INDEX idx_queue_next_retry ON lemonway_temp.lemonway_request_queue(next_retry_at) WHERE status = 'failed';

-- 2. Custom Queries (for saved API queries)
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_custom_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  endpoint VARCHAR(255) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  request_body JSONB,
  expected_response_schema JSONB,
  tags VARCHAR(100)[],
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT FALSE,
  created_by_admin_id TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_custom_queries_name ON lemonway_temp.lemonway_custom_queries(name);
CREATE INDEX idx_custom_queries_active ON lemonway_temp.lemonway_custom_queries(is_active);

-- 3. Operation Types
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_operation_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('URGENT', 'NORMAL')),
  requires_sandbox BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_operation_types_code ON lemonway_temp.lemonway_operation_types(code);
CREATE INDEX idx_operation_types_active ON lemonway_temp.lemonway_operation_types(is_active);

-- 4. Sandbox Execution History
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_sandbox_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID REFERENCES lemonway_temp.lemonway_custom_queries(id) ON DELETE SET NULL,
  admin_id TEXT NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  response_status_code INTEGER,
  execution_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sandbox_admin ON lemonway_temp.lemonway_sandbox_history(admin_id);
CREATE INDEX idx_sandbox_created_at ON lemonway_temp.lemonway_sandbox_history(created_at DESC);

-- 5. Snapshots (for comparing request/response pairs)
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  request_payload JSONB NOT NULL,
  response_payload JSONB NOT NULL,
  tags VARCHAR(100)[],
  admin_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_snapshots_admin ON lemonway_temp.lemonway_snapshots(admin_id);
CREATE INDEX idx_snapshots_created_at ON lemonway_temp.lemonway_snapshots(created_at DESC);

-- 6. API Versions (for tracking query versions and rollback)
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_api_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID NOT NULL REFERENCES lemonway_temp.lemonway_custom_queries(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  request_body JSONB NOT NULL,
  changes_description TEXT,
  created_by_admin_id TEXT NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_query_version UNIQUE (query_id, version_number)
);

CREATE INDEX idx_versions_query_id ON lemonway_temp.lemonway_api_versions(query_id);
CREATE INDEX idx_versions_current ON lemonway_temp.lemonway_api_versions(is_current);

-- 7. Webhook Simulations
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_webhooks_sim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  admin_id TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_sim_admin ON lemonway_temp.lemonway_webhooks_sim(admin_id);
CREATE INDEX idx_webhooks_sim_created_at ON lemonway_temp.lemonway_webhooks_sim(created_at DESC);

-- 8. Health Check Results
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  response_time_ms INTEGER,
  last_error TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_health_checks_endpoint ON lemonway_temp.lemonway_health_checks(endpoint);
CREATE INDEX idx_health_checks_checked_at ON lemonway_temp.lemonway_health_checks(checked_at DESC);

-- 9. Rate Limiting Configuration
CREATE TABLE IF NOT EXISTS lemonway_temp.lemonway_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type VARCHAR(100) NOT NULL,
  requests_per_minute INTEGER DEFAULT 60,
  requests_per_hour INTEGER DEFAULT 3600,
  burst_allowance INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_operation_rate_limit UNIQUE (operation_type)
);

CREATE INDEX idx_rate_limits_active ON lemonway_temp.lemonway_rate_limits(is_active);

-- Verification Query
SELECT 'All OPCIÓN 2 tables created successfully' as status;
