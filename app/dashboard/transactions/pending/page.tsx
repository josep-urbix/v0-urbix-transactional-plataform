import { Suspense } from "react"
import { TransactionsList } from "@/components/transactions-list"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Pending Transactions - URBIX",
  description: "View pending integration transactions",
}

export default function PendingTransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pending Transactions</h2>
        <p className="text-muted-foreground">Monitor transactions awaiting processing</p>
      </div>

      <Suspense fallback={<div className="text-center py-8">Loading transactions...</div>}>
        <TransactionsList searchParams={Promise.resolve({ filter: "pending" })} />
      </Suspense>
    </div>
  )
}
