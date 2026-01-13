import { Suspense } from "react"
import { TransactionsList } from "@/components/transactions-list"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Failed Transactions - URBIX",
  description: "View failed integration transactions",
}

export default function FailedTransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Failed Transactions</h2>
        <p className="text-muted-foreground">Monitor transactions that encountered errors</p>
      </div>

      <Suspense fallback={<div className="text-center py-8">Loading transactions...</div>}>
        <TransactionsList searchParams={Promise.resolve({ filter: "failed" })} />
      </Suspense>
    </div>
  )
}
