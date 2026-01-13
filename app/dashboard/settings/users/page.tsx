import { requireAuth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UsersTable } from "@/components/users-table"
import { isAdminRole } from "@/lib/auth"

export const metadata = {
  title: "Gestión de Usuarios - URBIX",
  description: "Administrar usuarios y permisos",
}

export default async function UsersPage() {
  const session = await requireAuth()

  if (!isAdminRole(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <p className="text-muted-foreground mt-2">Administrar usuarios, roles y permisos del sistema</p>
      </div>

      <UsersTable />
    </div>
  )
}
