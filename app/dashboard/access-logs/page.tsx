import type { Metadata } from "next"
import { requireAuth, isAdminRole } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AccessLogsClient } from "@/components/access-logs-client"

export const metadata: Metadata = {
  title: "Access Logs - URBIX",
  description: "Registro de accesos al sistema",
}

export default async function AccessLogsPage() {
  const session = await requireAuth()

  if (!isAdminRole(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Access Logs</h1>
        <p className="text-muted-foreground mt-2">Registro de todos los accesos permitidos y denegados al sistema</p>
      </div>

      <AccessLogsClient />
    </div>
  )
}
