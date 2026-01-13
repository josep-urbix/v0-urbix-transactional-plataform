import { type NextRequest, NextResponse } from "next/server"
import { processLemonwayImports } from "@/lib/workers/lemonway-import-worker"
import { logCronExecution } from "@/lib/cron-logger"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")

  // Verify cron secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cronJobName = "process-lemonway-imports"

  try {
    await logCronExecution(cronJobName, "started", null)

    const result = await processLemonwayImports()

    await logCronExecution(cronJobName, "completed", result)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    await logCronExecution(cronJobName, "failed", { error: error.message })

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
