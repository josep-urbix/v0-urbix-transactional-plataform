import { type NextRequest, NextResponse } from "next/server"

const ALLOWED_ORIGINS = ["https://desktop.urbix.es", "http://localhost:3000", "http://localhost:3001"]

export function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some((allowed) => origin === allowed || origin.endsWith(".vercel.app"))

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  }
}

export function corsResponse(origin: string | null) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}

export function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin")
  return getCorsHeaders(origin)
}

export function handleCors(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin")
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  })
}
