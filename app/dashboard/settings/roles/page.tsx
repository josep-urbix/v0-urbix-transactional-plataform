import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { RolesManager } from "@/components/roles-manager"
import { isAdminRole } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Gestión de Roles - URBIX",
  description: "Configurar permisos y accesos por rol",
}

export default async function RolesPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Roles</h1>
        <p className="text-muted-foreground">Define los permisos y accesos que tiene cada rol en el sistema</p>
      </div>

      <RolesManager />
    </div>
  )
}
