import { Suspense } from "react"
import { SMSTemplatesClient } from "@/components/sms/sms-templates-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Plantillas SMS - Urbix",
  description: "Gestión de plantillas de SMS",
}

export default function SMSTemplatesPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#164AA6]">Plantillas SMS</h1>
        <p className="text-[#777777] mt-1">Gestiona las plantillas de mensajes SMS</p>
      </div>

      <Suspense fallback={<div>Cargando plantillas...</div>}>
        <SMSTemplatesClient />
      </Suspense>
    </div>
  )
}
