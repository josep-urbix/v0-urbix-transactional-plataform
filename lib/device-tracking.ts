import { sql } from "@/lib/db"
import { parseUserAgent, getClientIP } from "@/lib/investor-auth/utils"

export type TrustLevel = "basic" | "standard" | "high" | "verified"

export interface DeviceInfo {
  id?: string
  fingerprint: string
  name: string
  device_type: string
  browser: string
  os: string
  trust_level: TrustLevel
  is_trusted: boolean
  last_ip?: string
  last_city?: string
  last_country?: string
  metadata?: any
}

/**
 * Registra o actualiza un dispositivo durante el login
 */
export async function registerOrUpdateDevice(
  userId: string,
  deviceFingerprint: string,
  request: Request,
  has2FA = false,
): Promise<DeviceInfo> {
  const userAgent = request.headers.get("user-agent") || ""
  const { browser, os, device_type } = parseUserAgent(userAgent)
  const ip = getClientIP(request)

  const deviceName = `${browser} on ${os}`
  const trustLevel: TrustLevel = has2FA ? "standard" : "basic"

  const existing = await sql`
    SELECT * FROM investors."Device"
    WHERE user_id = ${userId} AND fingerprint = ${deviceFingerprint}
  `

  if (existing.length > 0) {
    // Actualizar dispositivo existente
    const updated = await sql`
      UPDATE investors."Device"
      SET 
        last_seen_at = NOW(),
        last_ip = ${ip},
        browser = ${browser},
        os = ${os},
        device_type = ${device_type},
        trust_level = ${trustLevel},
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{last_update}',
          to_jsonb(NOW())
        )
      WHERE id = ${existing[0].id}
      RETURNING *
    `
    return updated[0] as DeviceInfo
  } else {
    // Crear nuevo dispositivo
    const newDevice = await sql`
      INSERT INTO investors."Device" (
        user_id, fingerprint, name, device_type, browser, os,
        last_ip, trust_level, is_trusted, first_seen_at, last_seen_at,
        metadata
      ) VALUES (
        ${userId}, ${deviceFingerprint}, ${deviceName}, ${device_type},
        ${browser}, ${os}, ${ip}, ${trustLevel}, false, NOW(), NOW(),
        jsonb_build_object('created_via', 'auto_registration')
      )
      RETURNING *
    `

    return newDevice[0] as DeviceInfo
  }
}

/**
 * Actualiza el heartbeat de un dispositivo
 */
export async function updateDeviceHeartbeat(
  userId: string,
  deviceFingerprint: string,
  request: Request,
): Promise<boolean> {
  const ip = getClientIP(request)

  const result = await sql`
    UPDATE investors."Device"
    SET 
      last_seen_at = NOW(),
      last_ip = ${ip},
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{heartbeat_count}',
        to_jsonb(COALESCE((metadata->>'heartbeat_count')::int, 0) + 1)
      )
    WHERE user_id = ${userId} AND fingerprint = ${deviceFingerprint}
    RETURNING id
  `

  return result.length > 0
}

/**
 * Obtiene la configuración de tracking
 */
export async function getTrackingConfig(): Promise<{
  enabled: boolean
  intervalBasic: number
  intervalStandard: number
}> {
  const settings = await sql`
    SELECT key, value FROM public."AdminSettings"
    WHERE key IN (
      'device_tracking_enabled',
      'device_tracking_interval_basic',
      'device_tracking_interval_standard'
    )
  `

  const config = {
    enabled: true,
    intervalBasic: 600000,
    intervalStandard: 1800000,
  }

  settings.forEach((setting: any) => {
    if (setting.key === "device_tracking_enabled") {
      config.enabled = setting.value === "true"
    } else if (setting.key === "device_tracking_interval_basic") {
      config.intervalBasic = Number.parseInt(setting.value)
    } else if (setting.key === "device_tracking_interval_standard") {
      config.intervalStandard = Number.parseInt(setting.value)
    }
  })

  return config
}

/**
 * Obtiene el nivel de confianza de un dispositivo
 */
export async function getDeviceTrustLevel(userId: string, deviceFingerprint: string): Promise<TrustLevel | null> {
  const result = await sql`
    SELECT trust_level FROM investors."Device"
    WHERE user_id = ${userId} AND fingerprint = ${deviceFingerprint}
  `

  return result.length > 0 ? result[0].trust_level : null
}
