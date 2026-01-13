import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getSession, requireAdmin } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await getSession()

  const authResult = await requireAdmin(session?.user, "sms_logs", "view", request)
  if (!authResult.success) return authResult.error

  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    const logs = await sql`
      SELECT 
        l.id,
        l.template_key,
        l.to_phone,
        l.status,
        l.provider,
        l.error_code,
        l.error_message,
        l.created_at,
        t.name as template_name
      FROM public.sms_logs l
      LEFT JOIN public.sms_templates t ON l.template_key = t.key
      ORDER BY l.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Obtener total
    const countResult = await sql`
      SELECT COUNT(*)::integer as total 
      FROM public.sms_logs
    `
    const total = countResult[0]?.total || 0

    // Obtener estadísticas
    const statsResult = await sql`
      SELECT 
        COUNT(*)::integer as total,
        COUNT(*) FILTER (WHERE status = 'sent')::integer as sent,
        COUNT(*) FILTER (WHERE status = 'delivered')::integer as delivered,
        COUNT(*) FILTER (WHERE status = 'failed')::integer as failed,
        COUNT(*) FILTER (WHERE status = 'simulated')::integer as simulated,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::integer as last_24h,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::integer as last_7d
      FROM public.sms_logs
    `

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: statsResult[0] || {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        simulated: 0,
        last_24h: 0,
        last_7d: 0,
      },
    })
  } catch (error: any) {
    console.error("Error fetching SMS logs:", error)
    return NextResponse.json(
      {
        error: error.message || "Error al obtener logs de SMS",
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}
