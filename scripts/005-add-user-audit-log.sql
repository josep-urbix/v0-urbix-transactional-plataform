-- Add audit logging table for user changes
CREATE TABLE IF NOT EXISTS "UserAuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "changedBy" TEXT NOT NULL,
  "changes" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "UserAuditLog_userId_idx" ON "UserAuditLog"("userId");
CREATE INDEX IF NOT EXISTS "UserAuditLog_createdAt_idx" ON "UserAuditLog"("createdAt");
