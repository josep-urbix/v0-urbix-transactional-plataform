-- Create Users table
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT UNIQUE NOT NULL,
  "name" TEXT,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT DEFAULT 'admin',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create Transaction table for logging HubSpot interactions
CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "direction" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "meetingId" TEXT,
  "httpMethod" TEXT,
  "endpoint" TEXT,
  "requestPayload" TEXT,
  "responsePayload" TEXT,
  "httpStatusCode" INTEGER,
  "correlationId" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for Transaction table
CREATE INDEX IF NOT EXISTS "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX IF NOT EXISTS "Transaction_type_idx" ON "Transaction"("type");
CREATE INDEX IF NOT EXISTS "Transaction_meetingId_idx" ON "Transaction"("meetingId");
CREATE INDEX IF NOT EXISTS "Transaction_correlationId_idx" ON "Transaction"("correlationId");
CREATE INDEX IF NOT EXISTS "Transaction_createdAt_idx" ON "Transaction"("createdAt");

-- Create AppConfig table for global settings
CREATE TABLE IF NOT EXISTS "AppConfig" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "key" TEXT UNIQUE NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW()
);
