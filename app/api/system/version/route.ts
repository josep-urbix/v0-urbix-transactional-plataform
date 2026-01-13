import { NextResponse } from "next/server"
import { getBuildInfo } from "@/lib/version"

export const dynamic = "force-dynamic"

export async function GET() {
  const buildInfo = getBuildInfo()
  return NextResponse.json(buildInfo)
}
