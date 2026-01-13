import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Pagination
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "25")
    const offset = (page - 1) * limit

    // Filters
    const status = searchParams.get("status")
    const notifCategory = searchParams.get("notif_category")
    const eventType = searchParams.get("event_type")
    const walletExtId = searchParams.get("wallet_ext_id")
    const transactionId = searchParams.get("transaction_id")
    const dateFrom = searchParams.get("date_from")
    const dateTo = searchParams.get("date_to")
    const search = searchParams.get("search")

    // Build dynamic query based on filters
    let webhooks
    let totalResult

    // Base query without filters
    if (!status && !notifCategory && !eventType && !walletExtId && !transactionId && !dateFrom && !dateTo && !search) {
      webhooks = await sql`
        SELECT 
          id, notif_category, event_type, wallet_ext_id, wallet_int_id,
          transaction_id, amount, status_code, processing_status,
          received_at, processed_at, error_message, retry_count
        FROM lemonway_webhooks."WebhookDelivery"
        ORDER BY received_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      totalResult = await sql`
        SELECT COUNT(*) as count FROM lemonway_webhooks."WebhookDelivery"
      `
    }
    // With status filter only
    else if (
      status &&
      !notifCategory &&
      !eventType &&
      !walletExtId &&
      !transactionId &&
      !dateFrom &&
      !dateTo &&
      !search
    ) {
      webhooks = await sql`
        SELECT 
          id, notif_category, event_type, wallet_ext_id, wallet_int_id,
          transaction_id, amount, status_code, processing_status,
          received_at, processed_at, error_message, retry_count
        FROM lemonway_webhooks."WebhookDelivery"
        WHERE processing_status = ${status}::lemonway_webhooks.processing_status
        ORDER BY received_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      totalResult = await sql`
        SELECT COUNT(*) as count FROM lemonway_webhooks."WebhookDelivery"
        WHERE processing_status = ${status}::lemonway_webhooks.processing_status
      `
    }
    // With notif_category filter
    else if (
      notifCategory &&
      !status &&
      !eventType &&
      !walletExtId &&
      !transactionId &&
      !dateFrom &&
      !dateTo &&
      !search
    ) {
      const notifCategoryNum = Number.parseInt(notifCategory)
      webhooks = await sql`
        SELECT 
          id, notif_category, event_type, wallet_ext_id, wallet_int_id,
          transaction_id, amount, status_code, processing_status,
          received_at, processed_at, error_message, retry_count
        FROM lemonway_webhooks."WebhookDelivery"
        WHERE notif_category = ${notifCategoryNum}
        ORDER BY received_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      totalResult = await sql`
        SELECT COUNT(*) as count FROM lemonway_webhooks."WebhookDelivery"
        WHERE notif_category = ${notifCategoryNum}
      `
    }
    // With search filter (wallet or transaction)
    else if (search && !status && !notifCategory && !eventType && !dateFrom && !dateTo) {
      const searchPattern = `%${search}%`
      webhooks = await sql`
        SELECT 
          id, notif_category, event_type, wallet_ext_id, wallet_int_id,
          transaction_id, amount, status_code, processing_status,
          received_at, processed_at, error_message, retry_count
        FROM lemonway_webhooks."WebhookDelivery"
        WHERE wallet_ext_id ILIKE ${searchPattern}
           OR wallet_int_id ILIKE ${searchPattern}
           OR transaction_id ILIKE ${searchPattern}
        ORDER BY received_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      totalResult = await sql`
        SELECT COUNT(*) as count FROM lemonway_webhooks."WebhookDelivery"
        WHERE wallet_ext_id ILIKE ${searchPattern}
           OR wallet_int_id ILIKE ${searchPattern}
           OR transaction_id ILIKE ${searchPattern}
      `
    }
    // Combined filters - status + notif_category
    else if (status && notifCategory) {
      const notifCategoryNum = Number.parseInt(notifCategory)
      webhooks = await sql`
        SELECT 
          id, notif_category, event_type, wallet_ext_id, wallet_int_id,
          transaction_id, amount, status_code, processing_status,
          received_at, processed_at, error_message, retry_count
        FROM lemonway_webhooks."WebhookDelivery"
        WHERE processing_status = ${status}::lemonway_webhooks.processing_status
          AND notif_category = ${notifCategoryNum}
        ORDER BY received_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      totalResult = await sql`
        SELECT COUNT(*) as count FROM lemonway_webhooks."WebhookDelivery"
        WHERE processing_status = ${status}::lemonway_webhooks.processing_status
          AND notif_category = ${notifCategoryNum}
      `
    }
    // Fallback: all filters as a complex query
    else {
      // For complex combinations, build conditions array
      webhooks = await sql`
        SELECT 
          id, notif_category, event_type, wallet_ext_id, wallet_int_id,
          transaction_id, amount, status_code, processing_status,
          received_at, processed_at, error_message, retry_count
        FROM lemonway_webhooks."WebhookDelivery"
        WHERE 1=1
          AND (${status}::text IS NULL OR processing_status = ${status}::lemonway_webhooks.processing_status)
          AND (${notifCategory}::text IS NULL OR notif_category = ${Number.parseInt(notifCategory || "0")})
          AND (${eventType}::text IS NULL OR event_type = ${eventType}::lemonway_webhooks.event_type)
          AND (${walletExtId}::text IS NULL OR wallet_ext_id = ${walletExtId})
          AND (${transactionId}::text IS NULL OR transaction_id = ${transactionId})
          AND (${dateFrom}::text IS NULL OR received_at >= ${dateFrom}::timestamptz)
          AND (${dateTo}::text IS NULL OR received_at <= ${dateTo}::timestamptz)
        ORDER BY received_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      totalResult = await sql`
        SELECT COUNT(*) as count FROM lemonway_webhooks."WebhookDelivery"
        WHERE 1=1
          AND (${status}::text IS NULL OR processing_status = ${status}::lemonway_webhooks.processing_status)
          AND (${notifCategory}::text IS NULL OR notif_category = ${Number.parseInt(notifCategory || "0")})
          AND (${eventType}::text IS NULL OR event_type = ${eventType}::lemonway_webhooks.event_type)
          AND (${walletExtId}::text IS NULL OR wallet_ext_id = ${walletExtId})
          AND (${transactionId}::text IS NULL OR transaction_id = ${transactionId})
          AND (${dateFrom}::text IS NULL OR received_at >= ${dateFrom}::timestamptz)
          AND (${dateTo}::text IS NULL OR received_at <= ${dateTo}::timestamptz)
      `
    }

    const total = Number.parseInt(totalResult[0].count)

    // Get stats
    const stats = await sql`
      SELECT * FROM lemonway_webhooks."WebhookStats"
    `

    return NextResponse.json({
      webhooks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: stats[0] || {
        total_webhooks: 0,
        pending_count: 0,
        processing_count: 0,
        processed_count: 0,
        failed_count: 0,
        last_24h_count: 0,
        failed_24h_count: 0,
      },
    })
  } catch (error) {
    console.error("[AdminWebhooks] Error listing webhooks:", error)
    return NextResponse.json({ error: "Error listing webhooks" }, { status: 500 })
  }
}
