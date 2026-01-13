import { sql } from "@/lib/db"

export interface SMSTemplate {
  id: number
  key: string
  name: string
  description: string | null
  category: string
  body: string
  sender: string | null
  variables: Array<{ name: string; type: string; required: boolean }>
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface SMSApiConfig {
  id: number
  provider_name: string
  base_url: string
  auth_type: string
  access_token: string
  default_sender: string | null
  test_mode: boolean
  webhook_url: string | null
  created_at: Date
  updated_at: Date
}

export interface SMSLog {
  id: number
  template_key: string | null
  to_phone: string
  status: string
  provider: string
  error_code: string | null
  error_message: string | null
  created_at: Date
}

// SMS Templates
export async function getSMSTemplates(): Promise<SMSTemplate[]> {
  const templates = await sql`
    SELECT * FROM sms_templates 
    ORDER BY category, name
  `
  return templates as SMSTemplate[]
}

export async function getSMSTemplateByKey(key: string): Promise<SMSTemplate | null> {
  const templates = await sql`
    SELECT * FROM sms_templates 
    WHERE key = ${key}
    LIMIT 1
  `
  return templates[0] || null
}

export async function createSMSTemplate(
  data: Omit<SMSTemplate, "id" | "created_at" | "updated_at">,
): Promise<SMSTemplate> {
  const result = await sql`
    INSERT INTO sms_templates (key, name, description, category, body, sender, variables, is_active)
    VALUES (${data.key}, ${data.name}, ${data.description}, ${data.category}, ${data.body}, ${data.sender}, ${JSON.stringify(data.variables)}, ${data.is_active})
    RETURNING *
  `
  return result[0] as SMSTemplate
}

export async function updateSMSTemplate(
  key: string,
  data: Partial<Omit<SMSTemplate, "id" | "key" | "created_at" | "updated_at">>,
): Promise<SMSTemplate> {
  const result = await sql`
    UPDATE sms_templates 
    SET 
      name = COALESCE(${data.name}, name),
      description = COALESCE(${data.description}, description),
      category = COALESCE(${data.category}, category),
      body = COALESCE(${data.body}, body),
      sender = COALESCE(${data.sender}, sender),
      variables = COALESCE(${data.variables ? JSON.stringify(data.variables) : null}, variables),
      is_active = COALESCE(${data.is_active}, is_active)
    WHERE key = ${key}
    RETURNING *
  `
  return result[0] as SMSTemplate
}

// SMS API Config
export async function getSMSApiConfig(): Promise<SMSApiConfig | null> {
  const configs = await sql`
    SELECT * FROM sms_api_config 
    ORDER BY id DESC 
    LIMIT 1
  `
  return configs[0] || null
}

export async function upsertSMSApiConfig(
  data: Omit<SMSApiConfig, "id" | "created_at" | "updated_at">,
): Promise<SMSApiConfig> {
  // Use proper UPSERT with ON CONFLICT to update existing config
  const result = await sql`
    INSERT INTO sms_api_config (
      id,
      provider_name, 
      base_url, 
      auth_type, 
      access_token, 
      default_sender, 
      test_mode, 
      webhook_url
    )
    VALUES (
      1,
      ${data.provider_name}, 
      ${data.base_url}, 
      ${data.auth_type}, 
      ${data.access_token}, 
      ${data.default_sender}, 
      ${data.test_mode}, 
      ${data.webhook_url}
    )
    ON CONFLICT (id) 
    DO UPDATE SET
      provider_name = EXCLUDED.provider_name,
      base_url = EXCLUDED.base_url,
      auth_type = EXCLUDED.auth_type,
      access_token = EXCLUDED.access_token,
      default_sender = EXCLUDED.default_sender,
      test_mode = EXCLUDED.test_mode,
      webhook_url = EXCLUDED.webhook_url,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `

  return result[0] as SMSApiConfig
}

// SMS Logs (for dashboard)
export async function getSMSLogs(limit = 20): Promise<SMSLog[]> {
  const logs = await sql`
    SELECT * FROM sms_logs 
    ORDER BY created_at DESC 
    LIMIT ${limit}
  `
  return logs as SMSLog[]
}

export async function getSMSDashboardStats() {
  // Total SMS last 24h
  const last24h = await sql`
    SELECT COUNT(*) as count 
    FROM sms_logs 
    WHERE created_at >= NOW() - INTERVAL '24 hours'
  `

  // Total SMS last 7 days
  const last7days = await sql`
    SELECT COUNT(*) as count 
    FROM sms_logs 
    WHERE created_at >= NOW() - INTERVAL '7 days'
  `

  // Delivery success rate last 7 days
  const deliveryRate = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      COUNT(*) as total
    FROM sms_logs 
    WHERE created_at >= NOW() - INTERVAL '7 days'
  `

  // Failed SMS last 7 days
  const failed = await sql`
    SELECT COUNT(*) as count 
    FROM sms_logs 
    WHERE created_at >= NOW() - INTERVAL '7 days' AND status = 'failed'
  `

  // SMS by day (last 30 days)
  const byDay = await sql`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM sms_logs 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `

  // SMS by status (last 7 days)
  const byStatus = await sql`
    SELECT 
      status,
      COUNT(*) as count
    FROM sms_logs 
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY status
  `

  // Top templates by usage (last 7 days)
  const topTemplates = await sql`
    SELECT 
      template_key,
      COUNT(*) as count
    FROM sms_logs 
    WHERE created_at >= NOW() - INTERVAL '7 days' AND template_key IS NOT NULL
    GROUP BY template_key
    ORDER BY count DESC
    LIMIT 5
  `

  return {
    total24h: Number.parseInt(last24h[0]?.count || "0"),
    total7days: Number.parseInt(last7days[0]?.count || "0"),
    deliveryRate:
      deliveryRate[0]?.total > 0
        ? (Number.parseInt(deliveryRate[0]?.delivered || "0") / Number.parseInt(deliveryRate[0]?.total || "1")) * 100
        : 0,
    failed7days: Number.parseInt(failed[0]?.count || "0"),
    byDay: byDay.map((d) => ({ date: d.date, count: Number.parseInt(d.count) })),
    byStatus: byStatus.map((s) => ({ status: s.status, count: Number.parseInt(s.count) })),
    topTemplates: topTemplates.map((t) => ({ template: t.template_key, count: Number.parseInt(t.count) })),
  }
}
