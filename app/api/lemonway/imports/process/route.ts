import { NextResponse } from "next/server"
import { processLemonwayImports } from "@/lib/workers/lemonway-import-worker"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  console.log("[v0] Process imports endpoint called")

  const logId = `log-${Date.now()}`

  try {
    console.log("[v0] Calling worker...")
    const result = await processLemonwayImports()
    console.log("[v0] Worker result:", result)
    await sql`INSERT INTO lemonway_temp.import_debug_logs (id, message) VALUES (${logId}, ${"Worker result: " + JSON.stringify(result)})`

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error("[v0] Error processing imports:", error)
    const errorMsg = error instanceof Error ? error.message : String(error)
    await sql`INSERT INTO lemonway_temp.import_debug_logs (id, message) VALUES (${logId}, ${"ERROR: " + errorMsg})`

    return NextResponse.json(
      {
        error: "Error al procesar importaciones",
        details: errorMsg,
      },
      { status: 500 },
    )
  }
}
