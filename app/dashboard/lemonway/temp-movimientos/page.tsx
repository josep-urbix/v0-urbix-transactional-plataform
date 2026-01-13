import type { Metadata } from "next"
import { getSession } from "@/lib/auth"
import { LemonwayTempMovimientos } from "@/components/lemonway/temp-movimientos"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Movimientos Temporales - URBIX",
  description: "Gestión de movimientos temporales importados desde Lemonway",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LemonwayTempMovimientosPage() {
  const session = await getSession()

  // En producción redirige si no hay sesión, pero en preview permite continuar
  if (!session && process.env.NODE_ENV === "production") {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Movimientos Temporales</h1>
        <p className="text-muted-foreground mt-2">Revisa y gestiona los movimientos importados antes de confirmarlos</p>
      </div>

      <LemonwayTempMovimientos />
    </div>
  )
}
