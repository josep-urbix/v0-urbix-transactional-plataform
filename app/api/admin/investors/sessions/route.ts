import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const showAll = searchParams.get("showAll") === "true"

    const activeFilter = showAll ? sql`` : sql`AND s.is_active = true AND s.expires_at > NOW()`

    let sessions
    if (search) {
      sessions = await sql`
        SELECT 
          s.id,
          s.user_id,
          u.email as user_email,
          u.first_name || ' ' || u.last_name as user_name,
          s.device_info,
          s.ip_address,
          s.user_agent,
          s.is_active,
          s.created_at,
          s.last_activity_at,
          s.expires_at
        FROM investors."Session" s
        JOIN investors."User" u ON s.user_id = u.id
        WHERE (u.email ILIKE ${"%" + search + "%"}
          OR u.first_name ILIKE ${"%" + search + "%"}
          OR u.last_name ILIKE ${"%" + search + "%"})
          ${activeFilter}
        ORDER BY s.last_activity_at DESC
        LIMIT 100
      `
    } else {
      sessions = await sql`
        SELECT 
          s.id,
          s.user_id,
          u.email as user_email,
          u.first_name || ' ' || u.last_name as user_name,
          s.device_info,
          s.ip_address,
          s.user_agent,
          s.is_active,
          s.created_at,
          s.last_activity_at,
          s.expires_at
        FROM investors."Session" s
        JOIN investors."User" u ON s.user_id = u.id
        WHERE 1=1 ${activeFilter}
        ORDER BY s.last_activity_at DESC
        LIMIT 100
      `
    }

    const statsResult = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE is_active = true AND expires_at > NOW())::int as active,
        COUNT(*) FILTER (WHERE is_active = false OR expires_at <= NOW())::int as expired
      FROM investors."Session"
    `

    return NextResponse.json({
      sessions,
      stats: statsResult[0],
    })
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 })
  }
}
