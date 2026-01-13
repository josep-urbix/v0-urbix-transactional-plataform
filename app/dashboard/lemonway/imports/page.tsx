import type { Metadata } from "next"
import { requireAuth } from "@/lib/auth"
import { LemonwayImportsList } from "@/components/lemonway/imports-list"

export const metadata: Metadata = {
  title: "Importaciones Lemonway - URBIX",
  description: "Gestión de importaciones de transacciones desde Lemonway",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LemonwayImportsPage() {
  await requireAuth()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Importaciones de Transacciones</h1>
        <p className="text-muted-foreground mt-2">
          Importa y gestiona las transacciones desde Lemonway al sistema temporal
        </p>
      </div>

      <LemonwayImportsList />
    </div>
  )
}
