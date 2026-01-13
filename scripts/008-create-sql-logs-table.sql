-- Create SQL transaction logs table
CREATE TABLE IF NOT EXISTS "SQLLog" (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  params JSONB,
  execution_time_ms NUMERIC(10, 3),
  rows_affected INTEGER,
  status VARCHAR(20) NOT NULL, -- 'success' or 'error'
  error_message TEXT,
  api_endpoint VARCHAR(255),
  user_email VARCHAR(255),
  ip_address VARCHAR(45),
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sql_logs_created_at ON "SQLLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_sql_logs_status ON "SQLLog"(status);
CREATE INDEX IF NOT EXISTS idx_sql_logs_api_endpoint ON "SQLLog"(api_endpoint);
CREATE INDEX IF NOT EXISTS idx_sql_logs_user_email ON "SQLLog"(user_email);

-- Add comment
COMMENT ON TABLE "SQLLog" IS 'Logs all SQL queries executed by the application with detailed information';
