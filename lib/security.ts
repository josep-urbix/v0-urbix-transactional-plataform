import * as crypto from "crypto"

/**
 * Security utilities for production environments
 */

// Sanitize error messages for production
export function sanitizeErrorMessage(error: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return "An error occurred. Please try again later."
  }
  return error instanceof Error ? error.message : String(error)
}

// Safe logging that respects environment
export function secureLog(message: string, data?: any) {
  if (process.env.NODE_ENV !== "production") {
    console.log(message, data)
  }
}

export function secureError(message: string, error?: any) {
  if (process.env.NODE_ENV !== "production") {
    console.error(message, error)
  } else {
    console.error(message, "Error occurred")
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

// Validate password strength
export function isStrongPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" }
  }
  if (password.length > 128) {
    return { valid: false, message: "Password is too long" }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" }
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one letter" }
  }
  return { valid: true }
}

// Generate secure random string
export function generateSecureToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex")
}

// Sanitize user input to prevent XSS
export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, "").trim().slice(0, 1000)
}

// Check if request comes from allowed origin
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true

  const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"].filter(Boolean)

  return allowedOrigins.some((allowed) => origin.startsWith(allowed as string))
}

export function maskSensitiveData(data: string, visibleChars = 5): string {
  if (data.length <= visibleChars * 2) {
    return "*".repeat(data.length)
  }
  return `${data.substring(0, visibleChars)}${"*".repeat(data.length - visibleChars * 2)}${data.substring(data.length - visibleChars)}`
}
