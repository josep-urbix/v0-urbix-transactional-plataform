import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

// Pixel transparente 1x1 en formato GIF
const TRACKING_PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  try {
    // Registrar la apertura
    const result = await sql`
      UPDATE emails.email_sends 
      SET 
        status = CASE 
          WHEN status = 'sent' THEN 'opened' 
          ELSE status 
        END,
        opened_at = CASE 
          WHEN opened_at IS NULL THEN NOW() 
          ELSE opened_at 
        END,
        open_count = COALESCE(open_count, 0) + 1,
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{open_tracking}',
          jsonb_build_object(
            'first_open', COALESCE(opened_at, NOW()),
            'last_open', NOW(),
            'user_agent', ${request.headers.get("user-agent") || "unknown"},
            'ip', ${request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"}
          )
        )
      WHERE id = ${Number.parseInt(id)}
      RETURNING id, status, open_count, opened_at
    `
  } catch (error) {
    // No fallar si hay error de tracking, solo loguear
    console.error("Error tracking email open:", error)
  }

  // Devolver el pixel transparente
  return new NextResponse(TRACKING_PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}
