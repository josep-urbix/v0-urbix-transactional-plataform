import { OperationTypesManager } from "@/components/virtual-accounts/operation-types-manager"

export const metadata = {
  title: "Tipos de Operación - URBIX",
  description: "Gestión de tipos de operación para cuentas virtuales",
}

export default function OperationTypesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#164AA6]">Tipos de Operación</h1>
        <p className="text-[#777777] mt-2">Gestiona los tipos de operación para las cuentas virtuales</p>
      </div>
      <OperationTypesManager />
    </div>
  )
}
