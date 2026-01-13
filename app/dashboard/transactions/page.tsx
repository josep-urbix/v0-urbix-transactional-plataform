import { Suspense } from "react"
import { TransactionsList } from "@/components/transactions-list"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Transactions - URBIX",
  description: "View all integration transactions",
}

export default function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
        <p className="text-muted-foreground">Monitor all HubSpot API interactions and webhook events</p>
      </div>

      <Suspense fallback={<div className="text-center py-8">Loading transactions...</div>}>
        <TransactionsList searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
