import { neon } from "@neondatabase/serverless"
import type { LemonwayApiMethod, LemonwayApiCallHistory, LemonwayApiPreset } from "@/lib/types/lemonway-api"

const sql = neon(process.env.DATABASE_URL!)

export class LemonwayApiRepository {
  // Methods
  async getAllMethods(filters?: {
    category?: string
    is_enabled?: boolean
    search?: string
  }): Promise<LemonwayApiMethod[]> {
    let query = `
      SELECT * FROM lemonway_api_methods
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (filters?.category) {
      query += ` AND category = $${paramIndex}`
      params.push(filters.category)
      paramIndex++
    }

    if (filters?.is_enabled !== undefined) {
      query += ` AND is_enabled = $${paramIndex}`
      params.push(filters.is_enabled)
      paramIndex++
    }

    if (filters?.search) {
      query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      params.push(`%${filters.search}%`)
      paramIndex++
    }

    query += ` ORDER BY category, name`

    return await sql(query, params)
  }

  async getMethodById(id: string): Promise<LemonwayApiMethod | null> {
    const result = await sql("SELECT * FROM lemonway_api_methods WHERE id = $1", [id])
    return result[0] || null
  }

  async toggleMethodStatus(id: string, enabled: boolean): Promise<void> {
    await sql("UPDATE lemonway_api_methods SET is_enabled = $1, updated_at = NOW() WHERE id = $2", [enabled, id])
  }

  // History
  async getCallHistory(filters?: {
    method_id?: string
    user_id?: string
    success?: boolean
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }): Promise<{ items: LemonwayApiCallHistory[]; total: number }> {
    let query = `
      SELECT 
        h.*,
        m.name as method_name,
        u.email as user_email
      FROM lemonway_api_call_history h
      LEFT JOIN lemonway_api_methods m ON h.method_id = m.id
      LEFT JOIN public."User" u ON h.user_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (filters?.method_id) {
      query += ` AND h.method_id = $${paramIndex}`
      params.push(filters.method_id)
      paramIndex++
    }

    if (filters?.user_id) {
      query += ` AND h.user_id = $${paramIndex}`
      params.push(filters.user_id)
      paramIndex++
    }

    if (filters?.success !== undefined) {
      query += ` AND h.success = $${paramIndex}`
      params.push(filters.success)
      paramIndex++
    }

    if (filters?.start_date) {
      query += ` AND h.created_at >= $${paramIndex}`
      params.push(filters.start_date)
      paramIndex++
    }

    if (filters?.end_date) {
      query += ` AND h.created_at <= $${paramIndex}`
      params.push(filters.end_date)
      paramIndex++
    }

    // Get total count
    const countQuery = query.replace("SELECT h.*, m.name as method_name, u.email as user_email", "SELECT COUNT(*)")
    const countResult = await sql(countQuery, params)
    const total = Number.parseInt(countResult[0].count)

    // Get paginated results
    query += ` ORDER BY h.created_at DESC`

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(filters.limit)
      paramIndex++
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex}`
      params.push(filters.offset)
      paramIndex++
    }

    const items = await sql(query, params)

    return { items, total }
  }

  async createCallHistory(data: {
    method_id: string
    user_id: string
    request_payload: Record<string, any>
    response_payload: Record<string, any>
    status_code: number
    duration_ms: number
    success: boolean
    error_message?: string
  }): Promise<LemonwayApiCallHistory> {
    const result = await sql(
      `INSERT INTO lemonway_api_call_history 
        (method_id, user_id, request_payload, response_payload, status_code, duration_ms, success, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        data.method_id,
        data.user_id,
        JSON.stringify(data.request_payload),
        JSON.stringify(data.response_payload),
        data.status_code,
        data.duration_ms,
        data.success,
        data.error_message || null,
      ],
    )
    return result[0]
  }

  // Presets
  async getUserPresets(user_id: string, method_id?: string): Promise<LemonwayApiPreset[]> {
    let query = `
      SELECT 
        p.*,
        m.name as method_name
      FROM lemonway_api_presets p
      LEFT JOIN lemonway_api_methods m ON p.method_id = m.id
      WHERE p.user_id = $1
    `
    const params: any[] = [user_id]

    if (method_id) {
      query += ` AND p.method_id = $2`
      params.push(method_id)
    }

    query += ` ORDER BY p.created_at DESC`

    return await sql(query, params)
  }

  async createPreset(data: {
    method_id: string
    user_id: string
    name: string
    description?: string
    parameters: Record<string, any>
  }): Promise<LemonwayApiPreset> {
    const result = await sql(
      `INSERT INTO lemonway_api_presets 
        (method_id, user_id, name, description, parameters)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [data.method_id, data.user_id, data.name, data.description || null, JSON.stringify(data.parameters)],
    )
    return result[0]
  }

  async deletePreset(id: string, user_id: string): Promise<void> {
    await sql("DELETE FROM lemonway_api_presets WHERE id = $1 AND user_id = $2", [id, user_id])
  }
}
