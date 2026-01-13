import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

// Listar inversores con filtros
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const kyc_status = searchParams.get("kyc_status") || ""
    const two_factor = searchParams.get("two_factor") || ""
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "25")
    const offset = (page - 1) * limit

    // Construir query base
    let investors
    let total

    if (search && status && kyc_status) {
      investors = await sql`
        SELECT 
          u.*,
          (SELECT COUNT(*) FROM investors."Session" s WHERE s.user_id = u.id AND s.is_active = TRUE) as active_sessions,
          (SELECT COUNT(*) FROM investors."WalletLink" w WHERE w.user_id = u.id AND w.status = 'verified') as linked_wallets
        FROM investors."User" u
        WHERE u.deleted_at IS NULL
          AND (u.email ILIKE ${"%" + search + "%"} OR u.first_name ILIKE ${"%" + search + "%"} OR u.last_name ILIKE ${"%" + search + "%"})
          AND u.status = ${status}
          AND u.kyc_status = ${kyc_status}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      total = await sql`
        SELECT COUNT(*) as count FROM investors."User" u
        WHERE u.deleted_at IS NULL
          AND (u.email ILIKE ${"%" + search + "%"} OR u.first_name ILIKE ${"%" + search + "%"} OR u.last_name ILIKE ${"%" + search + "%"})
          AND u.status = ${status}
          AND u.kyc_status = ${kyc_status}
      `
    } else if (search && status) {
      investors = await sql`
        SELECT 
          u.*,
          (SELECT COUNT(*) FROM investors."Session" s WHERE s.user_id = u.id AND s.is_active = TRUE) as active_sessions,
          (SELECT COUNT(*) FROM investors."WalletLink" w WHERE w.user_id = u.id AND w.status = 'verified') as linked_wallets
        FROM investors."User" u
        WHERE u.deleted_at IS NULL
          AND (u.email ILIKE ${"%" + search + "%"} OR u.first_name ILIKE ${"%" + search + "%"} OR u.last_name ILIKE ${"%" + search + "%"})
          AND u.status = ${status}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      total = await sql`
        SELECT COUNT(*) as count FROM investors."User" u
        WHERE u.deleted_at IS NULL
          AND (u.email ILIKE ${"%" + search + "%"} OR u.first_name ILIKE ${"%" + search + "%"} OR u.last_name ILIKE ${"%" + search + "%"})
          AND u.status = ${status}
      `
    } else if (search && kyc_status) {
      investors = await sql`
        SELECT 
          u.*,
          (SELECT COUNT(*) FROM investors."Session" s WHERE s.user_id = u.id AND s.is_active = TRUE) as active_sessions,
          (SELECT COUNT(*) FROM investors."WalletLink" w WHERE w.user_id = u.id AND w.status = 'verified') as linked_wallets
        FROM investors."User" u
        WHERE u.deleted_at IS NULL
          AND (u.email ILIKE ${"%" + search + "%"} OR u.first_name ILIKE ${"%" + search + "%"} OR u.last_name ILIKE ${"%" + search + "%"})
          AND u.kyc_status = ${kyc_status}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      total = await sql`
        SELECT COUNT(*) as count FROM investors."User" u
        WHERE u.deleted_at IS NULL
          AND (u.email ILIKE ${"%" + search + "%"} OR u.first_name ILIKE ${"%" + search + "%"} OR u.last_name ILIKE ${"%" + search + "%"})
          AND u.kyc_status = ${kyc_status}
      `
    } else if (status && kyc_status) {
      investors = await sql`
        SELECT 
          u.*,
          (SELECT COUNT(*) FROM investors."Session" s WHERE s.user_id = u.id AND s.is_active = TRUE) as active_sessions,
          (SELECT COUNT(*) FROM investors."WalletLink" w WHERE w.user_id = u.id AND w.status = 'verified') as linked_wallets
        FROM investors."User" u
        WHERE u.deleted_at IS NULL
          AND u.status = ${status}
          AND u.kyc_status = ${kyc_status}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      total = await sql`
        SELECT COUNT(*) as count FROM investors."User" u
        WHERE u.deleted_at IS NULL
          AND u.status = ${status}
          AND u.kyc_status = ${kyc_status}
      `
    } else if (search) {
      investors = await sql`
        SELECT 
          u.*,
          (SELECT COUNT(*) FROM investors."Session" s WHERE s.user_id = u.id AND s.is_active = TRUE) as active_sessions,
          (SELECT COUNT(*) FROM investors."WalletLink" w WHERE w.user_id = u.id AND w.status = 'verified') as linked_wallets
        FROM investors."User" u
        WHERE u.deleted_at IS NULL
          AND (u.email ILIKE ${"%" + search + "%"} OR u.first_name ILIKE ${"%" + search + "%"} OR u.last_name ILIKE ${"%" + search + "%"})
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      total = await sql`
        SELECT COUNT(*) as count FROM investors."User" u
        WHERE u.deleted_at IS NULL
          AND (u.email ILIKE ${"%" + search + "%"} OR u.first_name ILIKE ${"%" + search + "%"} OR u.last_name ILIKE ${"%" + search + "%"})
      `
    } else if (status) {
      investors = await sql`
        SELECT 
          u.*,
          (SELECT COUNT(*) FROM investors."Session" s WHERE s.user_id = u.id AND s.is_active = TRUE) as active_sessions,
          (SELECT COUNT(*) FROM investors."WalletLink" w WHERE w.user_id = u.id AND w.status = 'verified') as linked_wallets
        FROM investors."User" u
        WHERE u.deleted_at IS NULL AND u.status = ${status}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      total = await sql`
        SELECT COUNT(*) as count FROM investors."User" u
        WHERE u.deleted_at IS NULL AND u.status = ${status}
      `
    } else if (kyc_status) {
      investors = await sql`
        SELECT 
          u.*,
          (SELECT COUNT(*) FROM investors."Session" s WHERE s.user_id = u.id AND s.is_active = TRUE) as active_sessions,
          (SELECT COUNT(*) FROM investors."WalletLink" w WHERE w.user_id = u.id AND w.status = 'verified') as linked_wallets
        FROM investors."User" u
        WHERE u.deleted_at IS NULL AND u.kyc_status = ${kyc_status}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      total = await sql`
        SELECT COUNT(*) as count FROM investors."User" u
        WHERE u.deleted_at IS NULL AND u.kyc_status = ${kyc_status}
      `
    } else {
      investors = await sql`
        SELECT 
          u.*,
          (SELECT COUNT(*) FROM investors."Session" s WHERE s.user_id = u.id AND s.is_active = TRUE) as active_sessions,
          (SELECT COUNT(*) FROM investors."WalletLink" w WHERE w.user_id = u.id AND w.status = 'verified') as linked_wallets
        FROM investors."User" u
        WHERE u.deleted_at IS NULL
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      total = await sql`
        SELECT COUNT(*) as count FROM investors."User" u
        WHERE u.deleted_at IS NULL
      `
    }

    return NextResponse.json({
      investors,
      pagination: {
        page,
        limit,
        total: Number.parseInt(total[0].count),
        totalPages: Math.ceil(Number.parseInt(total[0].count) / limit),
      },
    })
  } catch (error) {
    console.error("Error listando inversores:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
