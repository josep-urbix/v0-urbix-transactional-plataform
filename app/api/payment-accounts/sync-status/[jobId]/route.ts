import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { jobId: string } }) {
  // Este endpoint permitirá consultar el estado de un job de sincronización
  // Por ahora, retornamos la información desde los logs de Lemonway

  const { neon } = await import("@neondatabase/serverless")
  const sql = neon(process.env.DATABASE_URL!)

  // Buscar las transacciones del job en los últimos 5 minutos
  const results = await sql`
    SELECT 
      request_body,
      response_body,
      success,
      error_message,
      created_at
    FROM payments."LemonwayApiCallLog"
    WHERE created_at > NOW() - INTERVAL '5 minutes'
    ORDER BY created_at DESC
    LIMIT 100
  `

  return NextResponse.json({
    jobId: params.jobId,
    recentCalls: results.length,
    calls: results,
  })
}
