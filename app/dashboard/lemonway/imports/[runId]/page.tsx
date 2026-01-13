import type { Metadata } from "next"
import { requireAuth } from "@/lib/auth"
import { LemonwayImportDetail } from "@/components/lemonway/import-detail"

export const metadata: Metadata = {
  title: "Detalle de Importación - URBIX",
  description: "Detalle de una importación de transacciones desde Lemonway",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

interface PageProps {
  params: Promise<{
    runId: string
  }>
}

export default async function LemonwayImportDetailPage({ params }: PageProps) {
  await requireAuth()
  const { runId } = await params

  return (
    <div className="container mx-auto py-8 px-4">
      <LemonwayImportDetail runId={runId} />
    </div>
  )
}
