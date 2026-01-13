import { Suspense } from "react"
import { SMSDashboardClient } from "@/components/sms/sms-dashboard-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Dashboard SMS - Urbix",
  description: "Panel de control y métricas de SMS",
}

export default function SMSDashboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#164AA6]">Dashboard SMS</h1>
        <p className="text-[#777777] mt-1">Métricas y estadísticas de envío de SMS</p>
      </div>

      <Suspense fallback={<div>Cargando dashboard...</div>}>
        <SMSDashboardClient />
      </Suspense>
    </div>
  )
}
