import { sql } from "@/lib/db"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")
    if (!sessionCookie) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { migration } = await request.json()

    if (!migration) {
      return NextResponse.json({ error: "Migration name required" }, { status: 400 })
    }

    if (migration === "022-add-processing-lock") {
      await sql`ALTER TABLE "LemonwayApiCallLog" ADD COLUMN IF NOT EXISTS processing_lock_at TIMESTAMPTZ DEFAULT NULL`
    } else if (migration === "021-add-request-id") {
      await sql`ALTER TABLE "LemonwayApiCallLog" ADD COLUMN IF NOT EXISTS request_id VARCHAR(255) DEFAULT NULL`
      await sql`UPDATE "LemonwayApiCallLog" SET request_id = CAST(id AS VARCHAR) WHERE request_id IS NULL`
    } else {
      return NextResponse.json(
        {
          error: "Migration not found",
          available: ["021-add-request-id", "022-add-processing-lock"],
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Migration ${migration} executed successfully`,
    })
  } catch (error) {
    console.error("Migration error:", error)
    return NextResponse.json(
      {
        error: "Migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    availableMigrations: ["021-add-request-id", "022-add-processing-lock"],
    usage: "POST /api/admin/run-migration with body: { migration: 'migration-name' }",
  })
}
