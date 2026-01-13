// Endpoint interno para ejecutar cron jobs desde el sistema interno
import { NextResponse } from "next/server"
import { executeCronJob } from "@/lib/cron-executor"

export async function POST(request: Request) {
  try {
    const { jobName } = await request.json()

    if (!jobName) {
      return NextResponse.json({ error: "jobName es requerido" }, { status: 400 })
    }

    console.log(`[CRON] Ejecutando: ${jobName}`)

    const result = await executeCronJob(jobName)

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    const jobName = request.headers.get("jobName") || "unknown" // Declare jobName before using it
    console.error(`[CRON] Error ejecutando ${jobName}:`, error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
