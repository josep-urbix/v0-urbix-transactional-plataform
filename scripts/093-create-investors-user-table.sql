-- Create investors schema if not exists
CREATE SCHEMA IF NOT EXISTS investors;

-- Create User table for investors
CREATE TABLE IF NOT EXISTS investors."User" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url TEXT,
    google_id VARCHAR(255),
    apple_id VARCHAR(255),
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(255),
    kyc_status VARCHAR(50) DEFAULT 'pending',
    kyc_submitted_at TIMESTAMP WITH TIME ZONE,
    kyc_verified_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_investors_user_email ON investors."User"(email);
CREATE INDEX IF NOT EXISTS idx_investors_user_google_id ON investors."User"(google_id);
CREATE INDEX IF NOT EXISTS idx_investors_user_apple_id ON investors."User"(apple_id);
CREATE INDEX IF NOT EXISTS idx_investors_user_status ON investors."User"(status);

-- Create Session table for investors
CREATE TABLE IF NOT EXISTS investors."Session" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES investors."User"(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255),
    device_info JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investors_session_user_id ON investors."Session"(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_session_token ON investors."Session"(token);
CREATE INDEX IF NOT EXISTS idx_investors_session_expires ON investors."Session"(expires_at);

-- Create ActivityLog table (optional, for logging)
CREATE TABLE IF NOT EXISTS investors."ActivityLog" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES investors."User"(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investors_activity_user_id ON investors."ActivityLog"(user_id);
CREATE INDEX IF NOT EXISTS idx_investors_activity_action ON investors."ActivityLog"(action);

-- Create LoginAttempt table (optional, for security)
CREATE TABLE IF NOT EXISTS investors."LoginAttempt" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    user_id UUID REFERENCES investors."User"(id) ON DELETE SET NULL,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investors_login_attempt_email ON investors."LoginAttempt"(email);
CREATE INDEX IF NOT EXISTS idx_investors_login_attempt_user_id ON investors."LoginAttempt"(user_id);
