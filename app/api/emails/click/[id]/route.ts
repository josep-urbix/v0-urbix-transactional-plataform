import { sql } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Obtener la URL de destino desde los query params
  const url = request.nextUrl.searchParams.get("url")

  if (!url) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  try {
    // Registrar el clic
    await sql`
      UPDATE emails.email_sends 
      SET 
        status = CASE 
          WHEN status IN ('sent', 'opened') THEN 'clicked' 
          ELSE status 
        END,
        clicked_at = CASE 
          WHEN clicked_at IS NULL THEN NOW() 
          ELSE clicked_at 
        END,
        click_count = COALESCE(click_count, 0) + 1,
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{click_tracking}',
          COALESCE(metadata->'click_tracking', '[]'::jsonb) || jsonb_build_object(
            'url', ${url},
            'clicked_at', NOW()::text,
            'user_agent', ${request.headers.get("user-agent") || "unknown"},
            'ip', ${request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"}
          )::jsonb
        )
      WHERE id = ${Number.parseInt(id)}
    `
  } catch (error) {
    console.error("Error tracking email click:", error)
  }

  // Redirigir al destino original
  return NextResponse.redirect(url)
}
