import { requireAuth } from "@/lib/auth"
import { PaymentAccountsTable } from "@/components/payment-accounts-table"

export const metadata = {
  title: "Cuentas de Pago - URBIX",
  description: "Gestionar cuentas de pago de Lemonway",
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function PaymentAccountsPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cuentas de Pago</h1>
        <p className="text-muted-foreground mt-2">Gestionar wallets y cuentas de pago integradas con Lemonway</p>
      </div>

      <PaymentAccountsTable />
    </div>
  )
}
