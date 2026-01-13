import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Transaction Detail - URBIX",
}

async function getTransaction(id: string) {
  try {
    const result = await sql`
      SELECT * FROM "Transaction"
      WHERE id = ${id}
      LIMIT 1
    `

    return result[0] || null
  } catch (error) {
    console.error("Error fetching transaction:", error)
    return null
  }
}

export default async function TransactionDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }

  const { id } = params
  const transaction = await getTransaction(id)

  if (!transaction) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transaction Detail</h2>
          <p className="text-muted-foreground">View complete transaction information</p>
        </div>
        <Link href="/dashboard/transactions">
          <Button variant="outline">Back to List</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Overview</CardTitle>
            <Badge variant={transaction.status === "SUCCESS" ? "default" : "destructive"}>{transaction.status}</Badge>
          </div>
          <CardDescription>Transaction ID: {transaction.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
              <p className="text-sm">{format(new Date(transaction.createdAt), "PPpp")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Direction</p>
              <Badge variant={transaction.direction === "INCOMING" ? "secondary" : "outline"}>
                {transaction.direction}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-sm font-mono">{transaction.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Meeting ID</p>
              <p className="text-sm font-mono">{transaction.meetingId || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">HTTP Method</p>
              <p className="text-sm font-mono">{transaction.httpMethod || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">HTTP Status</p>
              <p className="text-sm font-mono">{transaction.httpStatusCode || "N/A"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Endpoint</p>
              <p className="text-sm font-mono break-all">{transaction.endpoint || "N/A"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-muted-foreground">Correlation ID</p>
              <p className="text-sm font-mono break-all">{transaction.correlationId || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {transaction.requestPayload && (
        <Card>
          <CardHeader>
            <CardTitle>Request Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">{transaction.requestPayload}</pre>
          </CardContent>
        </Card>
      )}

      {transaction.responsePayload && (
        <Card>
          <CardHeader>
            <CardTitle>Response Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">{transaction.responsePayload}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
