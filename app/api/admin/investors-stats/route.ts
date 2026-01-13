import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const stats = await sql`
      SELECT * FROM investors.user_stats
    `

    // Estadísticas adicionales
    const sessionStats = await sql`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE is_active = TRUE) as active_sessions,
        COUNT(DISTINCT user_id) as users_with_sessions
      FROM investors."Session"
    `

    const walletStats = await sql`
      SELECT 
        COUNT(*) as total_links,
        COUNT(*) FILTER (WHERE status = 'verified') as verified_links,
        COUNT(DISTINCT user_id) as users_with_wallets
      FROM investors."WalletLink"
    `

    const loginStats = await sql`
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE success = TRUE) as successful,
        COUNT(*) FILTER (WHERE success = FALSE) as failed,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
      FROM investors."LoginAttempt"
    `

    return NextResponse.json({
      users: stats[0] || {},
      sessions: sessionStats[0] || {},
      wallets: walletStats[0] || {},
      logins: loginStats[0] || {},
    })
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
