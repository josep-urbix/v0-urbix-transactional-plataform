-- Tabla para registrar todas las llamadas al API de Lemonway
CREATE TABLE IF NOT EXISTS "LemonwayApiCallLog" (
  "id" SERIAL PRIMARY KEY,
  "endpoint" VARCHAR(255) NOT NULL,
  "method" VARCHAR(10) NOT NULL,
  "request_payload" JSONB,
  "response_payload" JSONB,
  "response_status" INTEGER,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "error_message" TEXT,
  "duration_ms" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_lemonway_api_call_log_created_at" ON "LemonwayApiCallLog"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_lemonway_api_call_log_endpoint" ON "LemonwayApiCallLog"("endpoint");
CREATE INDEX IF NOT EXISTS "idx_lemonway_api_call_log_success" ON "LemonwayApiCallLog"("success");
