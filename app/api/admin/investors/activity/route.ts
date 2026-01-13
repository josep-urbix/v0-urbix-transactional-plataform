import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const action = searchParams.get("action") || ""

    let activities
    if (search && action) {
      activities = await sql`
        SELECT 
          a.id,
          a.user_id,
          u.email as user_email,
          u.first_name || ' ' || u.last_name as user_name,
          a.action,
          a.details,
          a.ip_address,
          a.user_agent,
          a.created_at
        FROM investors."ActivityLog" a
        JOIN investors."User" u ON a.user_id = u.id
        WHERE a.action = ${action}
          AND (u.email ILIKE ${"%" + search + "%"}
            OR u.first_name ILIKE ${"%" + search + "%"}
            OR u.last_name ILIKE ${"%" + search + "%"})
        ORDER BY a.created_at DESC
        LIMIT 200
      `
    } else if (search) {
      activities = await sql`
        SELECT 
          a.id,
          a.user_id,
          u.email as user_email,
          u.first_name || ' ' || u.last_name as user_name,
          a.action,
          a.details,
          a.ip_address,
          a.user_agent,
          a.created_at
        FROM investors."ActivityLog" a
        JOIN investors."User" u ON a.user_id = u.id
        WHERE u.email ILIKE ${"%" + search + "%"}
          OR u.first_name ILIKE ${"%" + search + "%"}
          OR u.last_name ILIKE ${"%" + search + "%"}
        ORDER BY a.created_at DESC
        LIMIT 200
      `
    } else if (action) {
      activities = await sql`
        SELECT 
          a.id,
          a.user_id,
          u.email as user_email,
          u.first_name || ' ' || u.last_name as user_name,
          a.action,
          a.details,
          a.ip_address,
          a.user_agent,
          a.created_at
        FROM investors."ActivityLog" a
        JOIN investors."User" u ON a.user_id = u.id
        WHERE a.action = ${action}
        ORDER BY a.created_at DESC
        LIMIT 200
      `
    } else {
      activities = await sql`
        SELECT 
          a.id,
          a.user_id,
          u.email as user_email,
          u.first_name || ' ' || u.last_name as user_name,
          a.action,
          a.details,
          a.ip_address,
          a.user_agent,
          a.created_at
        FROM investors."ActivityLog" a
        JOIN investors."User" u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 200
      `
    }

    const statsResult = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int as today,
        COUNT(*) FILTER (WHERE action = 'login' AND created_at >= NOW() - INTERVAL '24 hours')::int as logins
      FROM investors."ActivityLog"
    `

    return NextResponse.json({
      activities,
      stats: statsResult[0],
    })
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json({ error: "Error al obtener actividad" }, { status: 500 })
  }
}
