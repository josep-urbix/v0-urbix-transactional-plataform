import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { createSQLLogger } from "@/lib/sql-logger"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const sql = createSQLLogger({
      apiEndpoint: "/api/transactions",
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    })

    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "25")
    const status = searchParams.get("status")
    const type = searchParams.get("type")
    const meetingId = searchParams.get("meetingId")
    const contactEmail = searchParams.get("contactEmail")
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const offset = (page - 1) * pageSize

    const whereConditions = []
    const queryParams = []

    if (status && status !== "") {
      whereConditions.push(`status = $${queryParams.length + 1}`)
      queryParams.push(status)
    }

    if (type && type !== "") {
      whereConditions.push(`type = $${queryParams.length + 1}`)
      queryParams.push(type)
    }

    if (meetingId && meetingId !== "") {
      whereConditions.push(`"meetingId" = $${queryParams.length + 1}`)
      queryParams.push(meetingId)
    }

    if (contactEmail && contactEmail !== "") {
      whereConditions.push(`"contactEmail" ILIKE $${queryParams.length + 1}`)
      queryParams.push(`%${contactEmail}%`)
    }

    if (from && from !== "") {
      whereConditions.push(`"createdAt" >= $${queryParams.length + 1}::timestamp`)
      queryParams.push(from)
    }

    if (to && to !== "") {
      whereConditions.push(`"createdAt" <= $${queryParams.length + 1}::timestamp`)
      queryParams.push(to)
    }

    queryParams.push(pageSize)
    queryParams.push(offset)

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : ""

    const limitParamIndex = queryParams.length - 1
    const offsetParamIndex = queryParams.length

    const itemsQuery = `
      SELECT * FROM "Transaction"
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${limitParamIndex}
      OFFSET $${offsetParamIndex}
    `

    const countQuery = `
      SELECT COUNT(*)::int as count FROM "Transaction"
      ${whereClause}
    `

    const items = await sql.query(itemsQuery, queryParams)
    const countParams = queryParams.slice(0, queryParams.length - 2)
    const totalResult = await sql.query(countQuery, countParams)

    const total = totalResult[0]?.count || 0

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error("[Transactions API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
