import { Suspense } from "react"
import { SMSApiConfigClient } from "@/components/sms/sms-api-config-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "API & Credenciales SMS - Urbix",
  description: "Configuración de API y credenciales SMS",
}

export default function SMSApiConfigPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#164AA6]">API & Credenciales SMS</h1>
        <p className="text-[#777777] mt-1">Configuración del proveedor de SMS</p>
      </div>

      <Suspense fallback={<div>Cargando configuración...</div>}>
        <SMSApiConfigClient />
      </Suspense>
    </div>
  )
}
