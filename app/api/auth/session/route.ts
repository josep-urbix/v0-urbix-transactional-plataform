import { NextResponse } from "next/server"
import { getMockSession } from "@/lib/mock-auth"

export async function GET() {
  try {
    const session = await getMockSession()
    return NextResponse.json(session)
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json(null)
  }
}
