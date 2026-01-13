import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    let devices
    if (search) {
      devices = await sql`
        SELECT 
          d.id,
          d.user_id,
          u.email as user_email,
          u.first_name || ' ' || u.last_name as user_name,
          d.device_type,
          d.name as device_name,
          d.browser,
          d.os,
          d.is_trusted,
          d.last_seen_at as last_used_at,
          d.first_seen_at as created_at
        FROM investors."Device" d
        JOIN investors."User" u ON d.user_id = u.id
        WHERE u.email ILIKE ${"%" + search + "%"}
          OR u.first_name ILIKE ${"%" + search + "%"}
          OR u.last_name ILIKE ${"%" + search + "%"}
        ORDER BY d.last_seen_at DESC
        LIMIT 100
      `
    } else {
      devices = await sql`
        SELECT 
          d.id,
          d.user_id,
          u.email as user_email,
          u.first_name || ' ' || u.last_name as user_name,
          d.device_type,
          d.name as device_name,
          d.browser,
          d.os,
          d.is_trusted,
          d.last_seen_at as last_used_at,
          d.first_seen_at as created_at
        FROM investors."Device" d
        JOIN investors."User" u ON d.user_id = u.id
        ORDER BY d.last_seen_at DESC
        LIMIT 100
      `
    }

    const statsResult = await sql`
      SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE is_trusted = true)::int as trusted,
        COUNT(*) FILTER (WHERE is_trusted = false)::int as untrusted
      FROM investors."Device"
    `

    return NextResponse.json({
      devices,
      stats: statsResult[0],
    })
  } catch (error) {
    console.error("Error fetching devices:", error)
    return NextResponse.json({ error: "Error al obtener dispositivos" }, { status: 500 })
  }
}
