import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { startCronExecution, endCronExecution } from "@/lib/cron-logger"

export async function GET(request: Request) {
  const executionId = await startCronExecution("verify-permissions-integrity")

  try {
    // Verificar autenticación del cron
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const permissionStats = await sql`
      SELECT 
        (SELECT COUNT(*) FROM public."Permission") as total_permissions,
        (SELECT COUNT(*) FROM public."Role" WHERE name = 'Admin') as admin_role_exists
    `

    const stats = permissionStats[0] || {}
    const issuesFixed = 0

    // Solo reportar conteos, no arrays grandes
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      permissionsTotal: Number.parseInt(stats.total_permissions || "0"),
      adminRoleExists: Number.parseInt(stats.admin_role_exists || "0") > 0,
      message: "Verificación de integridad de permisos completada",
    }

    await endCronExecution(executionId, "success", {
      permissionsTotal: result.permissionsTotal,
      adminRoleExists: result.adminRoleExists,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Cron] Error verificando integridad de permisos:", error?.message?.substring(0, 200))

    await endCronExecution(executionId, "failed", {
      errorMessage: error?.message?.substring(0, 200) || "Unknown error",
    })

    return NextResponse.json({ error: "Error al verificar integridad de permisos" }, { status: 500 })
  }
}
