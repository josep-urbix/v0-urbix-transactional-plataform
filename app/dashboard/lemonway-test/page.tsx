import { requireAuth } from "@/lib/auth"
import { LemonwayTestPanel } from "@/components/lemonway-test-panel"

export default async function LemonwayTestPage() {
  await requireAuth()

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Probar API de Lemonway</h1>
      <LemonwayTestPanel />
    </div>
  )
}
