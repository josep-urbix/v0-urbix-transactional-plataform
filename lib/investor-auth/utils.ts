import { createHash, randomBytes } from "crypto"
import * as bcrypt from "bcryptjs"

// Hash de tokens para almacenamiento seguro
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

// Generar token aleatorio
export function generateToken(length = 32): string {
  return randomBytes(length).toString("hex")
}

// Alias para generateToken
export const generateSecureToken = generateToken

// Generar código numérico (para 2FA backup codes)
export function generateNumericCode(length = 8): string {
  const digits = "0123456789"
  let code = ""
  const randomBytesArray = randomBytes(length)
  for (let i = 0; i < length; i++) {
    code += digits[randomBytesArray[i] % 10]
  }
  return code
}

// Hash de contraseña
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Verificar contraseña
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Generar TOTP secret (para 2FA)
export function generateTOTPSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let secret = ""
  const randomBytesArray = randomBytes(20)
  for (let i = 0; i < 20; i++) {
    secret += chars[randomBytesArray[i] % 32]
  }
  return secret
}

// Verificar código TOTP
export function verifyTOTP(secret: string, code: string, window = 1): boolean {
  const counter = Math.floor(Date.now() / 30000)

  for (let i = -window; i <= window; i++) {
    const expectedCode = generateTOTPCode(secret, counter + i)
    if (expectedCode === code) {
      return true
    }
  }
  return false
}

// Generar código TOTP
function generateTOTPCode(secret: string, counter: number): string {
  const hmac = createHash("sha1")

  // Convertir secret de base32 a bytes
  const secretBytes = base32ToBytes(secret)

  // Convertir counter a buffer de 8 bytes
  const counterBuffer = Buffer.alloc(8)
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = counter & 0xff
    counter = Math.floor(counter / 256)
  }

  // Calcular HMAC-SHA1
  const hmacResult = createHash("sha1")
    .update(Buffer.concat([secretBytes, counterBuffer]))
    .digest()

  // Dynamic truncation
  const offset = hmacResult[hmacResult.length - 1] & 0x0f
  const code =
    (((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff)) %
    1000000

  return code.toString().padStart(6, "0")
}

function base32ToBytes(base32: string): Buffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  const bytes: number[] = []
  let buffer = 0
  let bitsLeft = 0

  for (const char of base32.toUpperCase()) {
    const val = chars.indexOf(char)
    if (val === -1) continue

    buffer = (buffer << 5) | val
    bitsLeft += 5

    if (bitsLeft >= 8) {
      bitsLeft -= 8
      bytes.push((buffer >> bitsLeft) & 0xff)
    }
  }

  return Buffer.from(bytes)
}

// Parsear User-Agent para extraer información del dispositivo
export function parseUserAgent(userAgent: string): {
  browser: string
  os: string
  device_type: string
} {
  let browser = "Unknown"
  let os = "Unknown"
  let device_type = "desktop"

  // Detectar browser
  if (userAgent.includes("Firefox")) {
    browser = "Firefox"
  } else if (userAgent.includes("Chrome")) {
    browser = "Chrome"
  } else if (userAgent.includes("Safari")) {
    browser = "Safari"
  } else if (userAgent.includes("Edge")) {
    browser = "Edge"
  }

  // Detectar OS
  if (userAgent.includes("Windows")) {
    os = "Windows"
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS"
  } else if (userAgent.includes("Linux")) {
    os = "Linux"
  } else if (userAgent.includes("Android")) {
    os = "Android"
    device_type = "mobile"
  } else if (userAgent.includes("iOS") || userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS"
    device_type = userAgent.includes("iPad") ? "tablet" : "mobile"
  }

  return { browser, os, device_type }
}

// Obtener IP del cliente
export function getClientIP(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIP = request.headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }
  return null
}
