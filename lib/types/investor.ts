// =====================================================
// Tipos para el módulo de inversores
// =====================================================

export interface InvestorUser {
  id: string
  email: string
  phone?: string
  first_name?: string
  last_name?: string
  display_name?: string
  avatar_url?: string
  email_verified: boolean
  phone_verified: boolean
  google_id?: string
  apple_id?: string
  two_factor_enabled: boolean
  status: "pending_verification" | "active" | "suspended" | "blocked" | "deleted"
  status_reason?: string
  kyc_status: "none" | "pending" | "approved" | "rejected" | "expired"
  kyc_level: number
  kyc_verified_at?: string
  language: string
  timezone: string
  notification_preferences: {
    email: boolean
    push: boolean
    sms: boolean
  }
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  last_login_at?: string
}

export interface InvestorSession {
  id: string
  user_id: string
  expires_at: string
  device_id?: string
  device_name?: string
  device_type?: string
  browser?: string
  os?: string
  ip_address?: string
  country?: string
  city?: string
  is_active: boolean
  created_at: string
  last_activity_at: string
}

export interface InvestorDevice {
  id: string
  user_id: string
  fingerprint: string
  name?: string
  device_type: string
  browser?: string
  os?: string
  is_trusted: boolean
  trusted_at?: string
  first_seen_at: string
  last_seen_at: string
  last_ip?: string
  last_country?: string
  last_city?: string
}

export interface WalletLink {
  id: string
  user_id: string
  wallet_id: string
  wallet_internal_id?: string
  wallet_status?: string
  status: "pending" | "verified" | "suspended" | "revoked"
  verified_at?: string
  verified_by?: string
  last_sync_at?: string
  sync_error?: string
  created_at: string
  updated_at: string
}

export interface MagicLink {
  id: string
  user_id?: string
  email: string
  purpose: "login" | "register" | "verify_email" | "reset_password" | "link_device"
  expires_at: string
  used_at?: string
  ip_address?: string
  created_at: string
}

export interface LoginAttempt {
  id: string
  email?: string
  user_id?: string
  auth_method: "password" | "magic_link" | "google" | "apple" | "two_factor"
  success: boolean
  failure_reason?: string
  ip_address?: string
  user_agent?: string
  device_fingerprint?: string
  country?: string
  city?: string
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  category: "auth" | "profile" | "wallet" | "investment" | "security"
  description?: string
  metadata: Record<string, unknown>
  ip_address?: string
  session_id?: string
  created_at: string
}

export interface InvestorNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error" | "investment" | "kyc" | "security"
  read_at?: string
  action_url?: string
  action_label?: string
  created_at: string
  expires_at?: string
}

// Auth request/response types
export interface MagicLinkRequest {
  email: string
  purpose?: "login" | "register"
  device_fingerprint?: string
}

export interface MagicLinkVerifyRequest {
  token: string
  device_fingerprint?: string
  device_name?: string
}

export interface PasswordLoginRequest {
  email: string
  password: string
  device_fingerprint?: string
  two_factor_code?: string
}

export interface RegisterRequest {
  email: string
  password?: string
  first_name?: string
  last_name?: string
  phone?: string
  device_fingerprint?: string
}

export interface AuthResponse {
  success: boolean
  user?: InvestorUser
  access_token?: string
  refresh_token?: string
  expires_at?: string
  requires_2fa?: boolean
  error?: string
}

export interface Setup2FAResponse {
  secret: string
  qr_code_url: string
  backup_codes: string[]
}
