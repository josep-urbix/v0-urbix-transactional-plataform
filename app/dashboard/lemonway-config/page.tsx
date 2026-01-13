import type { Metadata } from "next"
import { requireAuth, checkPermission } from "@/lib/auth"
import { redirect } from "next/navigation"
import LemonwayConfigForm from "@/components/lemonway-config-form"

export const metadata: Metadata = {
  title: "Configuración Lemonway - URBIX",
  description: "Configurar credenciales y parámetros de API de Lemonway",
}

export default async function LemonwayConfigPage() {
  const session = await requireAuth()

  // Solo administradores pueden acceder
  if (!checkPermission(session.user.role, "settings", "read")) {
    redirect("/dashboard/transactions")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración Lemonway</h1>
        <p className="text-muted-foreground mt-2">
          Configura las credenciales y parámetros de conexión con la API de Lemonway
        </p>
      </div>

      <LemonwayConfigForm />
    </div>
  )
}
