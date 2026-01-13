import { sql } from "@/lib/db"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Wallets stats
    const walletsStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active' OR status = '6') as active,
        COUNT(*) FILTER (WHERE status = 'blocked' OR is_blocked = true) as blocked,
        COALESCE(SUM(balance), 0) as total_balance
      FROM payments.payment_accounts
    `

    // Lemonway API calls stats (last 24h)
    const lemonwayStats = await sql`
      SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE success = true) as successful,
        COUNT(*) FILTER (WHERE success = false) as failed,
        COUNT(*) FILTER (WHERE retry_status = 'pending') as pending_retries,
        ROUND(AVG(duration_ms)::numeric, 2) as avg_duration_ms
      FROM public."LemonwayApiCallLog"
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `

    // Lemonway transactions stats
    const lemonwayTxStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COALESCE(SUM(amount), 0) as total_amount
      FROM public."LemonwayTransaction"
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `

    // HubSpot transactions stats (last 24h)
    const hubspotStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE direction = 'INCOMING') as incoming,
        COUNT(*) FILTER (WHERE direction = 'OUTGOING') as outgoing,
        COUNT(*) FILTER (WHERE status = 'ERROR') as errors
      FROM public."Transaction"
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
    `

    // Gmail/Email stats (last 24h)
    const emailStats = await sql`
      SELECT 
        COUNT(*) as total_sent,
        COUNT(*) FILTER (WHERE status = 'sent') as delivered,
        COUNT(*) FILTER (WHERE status = 'opened') as opened,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COALESCE(SUM(open_count), 0) as total_opens,
        COALESCE(SUM(click_count), 0) as total_clicks
      FROM emails.email_sends
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `

    // Email templates stats
    const templateStats = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active
      FROM emails.email_templates
    `

    // SQL Logs stats (last 24h)
    const sqlStats = await sql`
      SELECT 
        COUNT(*) as total_queries,
        COUNT(*) FILTER (WHERE status = 'success') as successful,
        COUNT(*) FILTER (WHERE status = 'error') as failed,
        ROUND(AVG(execution_time_ms)::numeric, 2) as avg_execution_ms
      FROM public."SQLLog"
      WHERE "createdAt" >= NOW() - INTERVAL '24 hours'
    `

    // Cron jobs stats
    const cronStats = await sql`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE is_active = true) as active_jobs,
        SUM(total_runs) as total_runs,
        SUM(successful_runs) as successful_runs,
        SUM(failed_runs) as failed_runs
      FROM public."CronJob"
    `

    // Recent cron executions (last 24h)
    const cronExecutions = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'success') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        ROUND(AVG(duration_ms)::numeric, 2) as avg_duration_ms
      FROM public."CronJobExecution"
      WHERE created_at >= NOW() - INTERVAL '24 hours'
    `

    return NextResponse.json({
      wallets: {
        total: Number.parseInt(walletsStats[0].total) || 0,
        active: Number.parseInt(walletsStats[0].active) || 0,
        blocked: Number.parseInt(walletsStats[0].blocked) || 0,
        totalBalance: Number.parseFloat(walletsStats[0].total_balance) || 0,
      },
      lemonway: {
        apiCalls: {
          total: Number.parseInt(lemonwayStats[0].total_calls) || 0,
          successful: Number.parseInt(lemonwayStats[0].successful) || 0,
          failed: Number.parseInt(lemonwayStats[0].failed) || 0,
          pendingRetries: Number.parseInt(lemonwayStats[0].pending_retries) || 0,
          avgDurationMs: Number.parseFloat(lemonwayStats[0].avg_duration_ms) || 0,
        },
        transactions: {
          total: Number.parseInt(lemonwayTxStats[0].total) || 0,
          completed: Number.parseInt(lemonwayTxStats[0].completed) || 0,
          pending: Number.parseInt(lemonwayTxStats[0].pending) || 0,
          failed: Number.parseInt(lemonwayTxStats[0].failed) || 0,
          totalAmount: Number.parseFloat(lemonwayTxStats[0].total_amount) || 0,
        },
      },
      hubspot: {
        total: Number.parseInt(hubspotStats[0].total) || 0,
        incoming: Number.parseInt(hubspotStats[0].incoming) || 0,
        outgoing: Number.parseInt(hubspotStats[0].outgoing) || 0,
        errors: Number.parseInt(hubspotStats[0].errors) || 0,
      },
      gmail: {
        sent: Number.parseInt(emailStats[0].total_sent) || 0,
        delivered: Number.parseInt(emailStats[0].delivered) || 0,
        opened: Number.parseInt(emailStats[0].opened) || 0,
        failed: Number.parseInt(emailStats[0].failed) || 0,
        totalOpens: Number.parseInt(emailStats[0].total_opens) || 0,
        totalClicks: Number.parseInt(emailStats[0].total_clicks) || 0,
        templates: {
          total: Number.parseInt(templateStats[0].total) || 0,
          active: Number.parseInt(templateStats[0].active) || 0,
        },
      },
      sql: {
        totalQueries: Number.parseInt(sqlStats[0].total_queries) || 0,
        successful: Number.parseInt(sqlStats[0].successful) || 0,
        failed: Number.parseInt(sqlStats[0].failed) || 0,
        avgExecutionMs: Number.parseFloat(sqlStats[0].avg_execution_ms) || 0,
      },
      cron: {
        totalJobs: Number.parseInt(cronStats[0].total_jobs) || 0,
        activeJobs: Number.parseInt(cronStats[0].active_jobs) || 0,
        totalRuns: Number.parseInt(cronStats[0].total_runs) || 0,
        successfulRuns: Number.parseInt(cronStats[0].successful_runs) || 0,
        failedRuns: Number.parseInt(cronStats[0].failed_runs) || 0,
        recentExecutions: {
          total: Number.parseInt(cronExecutions[0].total) || 0,
          successful: Number.parseInt(cronExecutions[0].successful) || 0,
          failed: Number.parseInt(cronExecutions[0].failed) || 0,
          avgDurationMs: Number.parseFloat(cronExecutions[0].avg_duration_ms) || 0,
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Error al obtener estadísticas del dashboard" }, { status: 500 })
  }
}
