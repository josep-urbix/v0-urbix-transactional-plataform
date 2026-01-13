import { VirtualAccountsList } from "@/components/virtual-accounts/virtual-accounts-list"

export const metadata = {
  title: "Lista de Cuentas - URBIX",
  description: "Gestión de cuentas virtuales",
}

export default function VirtualAccountsListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#164AA6]">Cuentas Virtuales</h1>
        <p className="text-[#777777] mt-2">Gestiona las cuentas virtuales de los inversores</p>
      </div>
      <VirtualAccountsList />
    </div>
  )
}
