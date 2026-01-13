import type { Metadata } from "next"
import { SQLLogsViewer } from "@/components/sql-logs-viewer"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isAdminRole } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Transactions SQL - URBIX",
  description: "View all SQL transactions with detailed logging",
}

export default async function SQLLogsPage() {
  const session = await getSession()
  if (!session?.user) {
    redirect("/login")
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transactions SQL</h1>
        <p className="text-muted-foreground">
          Monitor todas las transacciones SQL ejecutadas en la base de datos con nivel de detalle completo
        </p>
      </div>

      <SQLLogsViewer />
    </div>
  )
}
