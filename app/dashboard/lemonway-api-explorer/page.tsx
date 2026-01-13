import type { Metadata } from "next"
import { requireAuth } from "@/lib/auth"
import { LemonwayApiExplorer } from "@/components/lemonway-api-explorer"

export const metadata: Metadata = {
  title: "Lemonway API Explorer - URBIX",
  description: "Explorador interactivo de métodos del API de Lemonway",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LemonwayApiExplorerPage() {
  await requireAuth({ requiredPermission: "lemonway_api:view" })

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Lemonway API Explorer</h1>
        <p className="text-muted-foreground mt-2">
          Explora, documenta y prueba todos los métodos disponibles del API de Lemonway
        </p>
      </div>

      <LemonwayApiExplorer />
    </div>
  )
}
