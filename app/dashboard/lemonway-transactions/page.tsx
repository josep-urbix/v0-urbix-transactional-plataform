import type { Metadata } from "next"
import { requireAuth } from "@/lib/auth"
import LemonwayTransactionsList from "@/components/lemonway-transactions-list"
import LemonwayQueueStats from "@/components/lemonway-queue-stats"
import { RetryQueueMonitor } from "@/components/retry-queue-monitor"

export const metadata: Metadata = {
  title: "Llamadas API Lemonway - URBIX",
  description: "Visualizar todas las llamadas al API de Lemonway",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function LemonwayTransactionsPage() {
  await requireAuth()

  return (
    <div className="container mx-auto py-8 px-4">
      <RetryQueueMonitor />

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Llamadas API Lemonway</h1>
        <p className="text-muted-foreground mt-2">Monitorea todas las peticiones y respuestas del API de Lemonway</p>
      </div>

      <div className="mb-6">
        <LemonwayQueueStats />
      </div>

      <LemonwayTransactionsList />
    </div>
  )
}
