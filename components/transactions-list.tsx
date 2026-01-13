"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { JsonTreeViewer } from "@/components/json-tree-viewer"
import { CheckCircle2, ChevronDown, ChevronUp, FileText, ExternalLink, Video, Calendar, X } from "lucide-react"
import { TransactionsFilters } from "@/components/transactions-filters"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
    }
    return res.json()
  })

interface GroupedTransaction {
  correlationId: string
  firstTransaction: any
  allTransactions: any[]
  hasGoogleMeet: boolean
  hasReschedule: boolean
  hasCancel: boolean
  contactEmail?: string
  meetingId?: string
  googleMeetLink?: string
  rescheduleLink?: string
  cancelLink?: string
}

interface Transaction {
  id: string
  correlationId: string
  createdAt: string
  direction: string
  type: string
  contactEmail?: string
  meetingId?: string
  googleMeetLink?: string
  rescheduleLink?: string
  cancelLink?: string
  requestPayload?: any
  responsePayload?: any
  endpoint?: string
  httpMethod?: string
}

export function TransactionsList({
  searchParams,
}: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const router = useRouter()
  const currentSearchParams = useSearchParams()
  const [selectedGroup, setSelectedGroup] = useState<GroupedTransaction | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showDetailedView, setShowDetailedView] = useState(false)
  const [expandedPayloads, setExpandedPayloads] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<"grouped" | "individual">("grouped")

  const params = new URLSearchParams(currentSearchParams.toString())
  const queryString = params.toString()

  const { data, error, isLoading, mutate } = useSWR(
    `/api/transactions${queryString ? `?${queryString}` : ""}`,
    fetcher,
    {
      refreshInterval: 5000,
    },
  )

  const handleRefresh = () => {
    console.log("[v0] handleRefresh called, calling mutate()")
    mutate()
  }

  const handleToggleView = () => {
    setViewMode(viewMode === "grouped" ? "individual" : "grouped")
  }

  const togglePayload = (id: string) => {
    const newExpandedPayloads = new Set(expandedPayloads)
    if (newExpandedPayloads.has(id)) {
      newExpandedPayloads.delete(id)
    } else {
      newExpandedPayloads.add(id)
    }
    setExpandedPayloads(newExpandedPayloads)
  }

  const handleViewDetails = (transaction: GroupedTransaction) => {
    console.log("[v0] Opening dialog for transaction:", {
      correlationId: transaction.correlationId,
      allTransactionsCount: transaction.allTransactions?.length,
      firstTransaction: transaction.firstTransaction?.type,
      hasPayloads: transaction.allTransactions?.some((t) => t.requestPayload || t.responsePayload),
    })
    setSelectedGroup(transaction)
    setIsDialogOpen(true)
    setShowDetailedView(false)
    setExpandedPayloads(new Set())
  }

  const handleViewIndividualDetails = (transaction: Transaction) => {
    console.log("[v0] Opening dialog for individual transaction:", {
      id: transaction.id,
      type: transaction.type,
    })

    // Wrap individual transaction in GroupedTransaction structure
    const wrappedTransaction: GroupedTransaction = {
      correlationId: transaction.correlationId || `single-${transaction.id}`,
      firstTransaction: transaction,
      allTransactions: [transaction],
      hasGoogleMeet: !!transaction.googleMeetLink,
      hasReschedule: !!transaction.rescheduleLink,
      hasCancel: !!transaction.cancelLink,
      contactEmail: transaction.contactEmail,
      meetingId: transaction.meetingId,
      googleMeetLink: transaction.googleMeetLink,
      rescheduleLink: transaction.rescheduleLink,
      cancelLink: transaction.cancelLink,
    }

    setSelectedGroup(wrappedTransaction)
    setIsDialogOpen(true)
    setShowDetailedView(false)
    setExpandedPayloads(new Set())
  }

  const items = data?.items || []
  const total = data?.total || 0
  const currentPage = data?.page || 1
  const totalPages = data?.totalPages || 1
  const limit = data?.pageSize || 25

  console.log("[v0] TransactionsList - Received data:", {
    hasData: !!data,
    itemsLength: items.length,
    total,
    currentPage,
    totalPages,
  })

  const { groupedTransactions, individualTransactions, displayTransactions } = useMemo(() => {
    console.log("[v0] TransactionsList - items:", items?.length || 0)
    console.log("[v0] TransactionsList - viewMode:", viewMode)

    if (!items || items.length === 0) {
      console.log("[v0] TransactionsList - No items available")
      return {
        groupedTransactions: [],
        individualTransactions: [],
        displayTransactions: [],
      }
    }

    const groupedTransactions: GroupedTransaction[] = []
    const groupMap = new Map<string, any[]>()

    items.forEach((transaction: any) => {
      const corrId = transaction.correlationId || transaction.id
      if (!groupMap.has(corrId)) {
        groupMap.set(corrId, [])
      }
      groupMap.get(corrId)!.push(transaction)
    })

    groupMap.forEach((transactions, correlationId) => {
      transactions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      const firstTransaction = transactions[0]
      const hasGoogleMeet = transactions.some((t) => t.googleMeetLink)
      const hasReschedule = transactions.some((t) => t.rescheduleLink)
      const hasCancel = transactions.some((t) => t.cancelLink)
      const contactEmail = transactions.find((t) => t.contactEmail)?.contactEmail
      const meetingId = transactions.find((t) => t.meetingId)?.meetingId
      const googleMeetLink = transactions.find((t) => t.googleMeetLink)?.googleMeetLink
      const rescheduleLink = transactions.find((t) => t.rescheduleLink)?.rescheduleLink
      const cancelLink = transactions.find((t) => t.cancelLink)?.cancelLink

      groupedTransactions.push({
        correlationId,
        firstTransaction,
        allTransactions: transactions,
        hasGoogleMeet,
        hasReschedule,
        hasCancel,
        contactEmail,
        meetingId,
        googleMeetLink,
        rescheduleLink,
        cancelLink,
      })
    })

    groupedTransactions.sort(
      (a, b) => new Date(b.firstTransaction.createdAt).getTime() - new Date(a.firstTransaction.createdAt).getTime(),
    )

    const individualTransactions = [...items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    const displayTransactions = viewMode === "grouped" ? groupedTransactions : individualTransactions

    console.log("[v0] TransactionsList - groupedTransactions:", groupedTransactions.length)
    console.log("[v0] TransactionsList - individualTransactions:", individualTransactions.length)
    console.log("[v0] TransactionsList - displayTransactions:", displayTransactions.length)

    return { groupedTransactions, individualTransactions, displayTransactions }
  }, [items, viewMode])

  const safeDisplayTransactions = displayTransactions || []
  const safeGroupedTransactions = groupedTransactions || []
  const safeIndividualTransactions = individualTransactions || []

  console.log("[v0] TransactionsList - About to render, displayTransactions:", safeDisplayTransactions.length)

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-destructive">
          Failed to load transactions. Please try again.
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">Loading transactions...</CardContent>
      </Card>
    )
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(currentSearchParams.toString())
    params.set("page", newPage.toString())
    router.push(`?${params.toString()}`)
  }

  const handleLimitChange = (newLimit: number) => {
    const params = new URLSearchParams(currentSearchParams.toString())
    params.set("pageSize", newLimit.toString())
    params.set("page", "1")
    window.location.href = `/dashboard/transactions?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter transactions by status, type, meeting ID, or date range</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsFilters
            onRefresh={handleRefresh}
            onToggleView={handleToggleView}
            viewMode={viewMode}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Mostrando {safeDisplayTransactions.length} de {total} transacciones
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Email Contacto</TableHead>
              <TableHead>Google Meet</TableHead>
              <TableHead>Reagendar</TableHead>
              <TableHead>Cancelar</TableHead>
              {viewMode === "grouped" && <TableHead>Pasos</TableHead>}
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeDisplayTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={viewMode === "grouped" ? 9 : 8} className="text-center py-8 text-muted-foreground">
                  No se encontraron transacciones. Los webhooks aparecerán aquí automáticamente.
                </TableCell>
              </TableRow>
            ) : viewMode === "grouped" ? (
              safeDisplayTransactions.map((transaction: any) => {
                const timestamp = transaction?.firstTransaction?.createdAt
                  ? format(new Date(transaction.firstTransaction.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es })
                  : "N/A"
                const direction = transaction?.firstTransaction?.direction || "N/A"
                const type = transaction?.firstTransaction?.type || "UNKNOWN"

                return (
                  <TableRow key={transaction.correlationId} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">{timestamp}</TableCell>
                    <TableCell>
                      <Badge variant={direction === "INCOMING" ? "default" : "secondary"}>{direction}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{transaction.contactEmail || "-"}</TableCell>
                    <TableCell>
                      {transaction.hasGoogleMeet ? (
                        <Badge variant="default" className="bg-green-500">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="secondary">-</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.hasReschedule ? (
                        <Badge variant="default" className="bg-blue-500">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="secondary">-</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.hasCancel ? (
                        <Badge variant="default" className="bg-orange-500">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="secondary">-</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{transaction?.allTransactions?.length || 0} pasos</Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(transaction)}>
                        Ver Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              safeDisplayTransactions.map((transaction: any) => {
                const timestamp = transaction?.createdAt
                  ? format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: es })
                  : "N/A"
                const direction = transaction?.direction || "N/A"
                const type = transaction?.type || "UNKNOWN"

                return (
                  <TableRow key={transaction.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-xs">{timestamp}</TableCell>
                    <TableCell>
                      <Badge variant={direction === "INCOMING" ? "default" : "secondary"}>{direction}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{transaction.contactEmail || "-"}</TableCell>
                    <TableCell>
                      {transaction.googleMeetLink ? (
                        <Badge variant="default" className="bg-green-500">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="secondary">-</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.rescheduleLink ? (
                        <Badge variant="default" className="bg-blue-500">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="secondary">-</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.cancelLink ? (
                        <Badge variant="default" className="bg-orange-500">
                          ✓
                        </Badge>
                      ) : (
                        <Badge variant="secondary">-</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewIndividualDetails(transaction)}>
                        Ver Detalles
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={limit.toString()} onValueChange={(value) => handleLimitChange(Number(value))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 registros</SelectItem>
              <SelectItem value="50">50 registros</SelectItem>
              <SelectItem value="100">100 registros</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Página {currentPage} de {totalPages}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Diálogo Detallado</DialogTitle>
            <DialogDescription>
              Todos los pasos de la conversación ({selectedGroup?.allTransactions?.length ?? 0} pasos)
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && !showDetailedView && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timestamp</Label>
                  <div className="text-sm">
                    {selectedGroup?.firstTransaction?.createdAt
                      ? format(new Date(selectedGroup.firstTransaction.createdAt), "dd/MM/yyyy HH:mm:ss", {
                          locale: es,
                        })
                      : "N/A"}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <div>
                    {selectedGroup?.firstTransaction?.status === "SUCCESS" ? (
                      <Badge variant="default">SUCCESS</Badge>
                    ) : selectedGroup?.firstTransaction?.status === "ERROR" ? (
                      <Badge variant="destructive">ERROR</Badge>
                    ) : (
                      <Badge variant="secondary">{selectedGroup?.firstTransaction?.status ?? "N/A"}</Badge>
                    )}
                  </div>
                </div>

                {selectedGroup.contactEmail && (
                  <div className="space-y-2 col-span-2">
                    <Label>Email del Contacto</Label>
                    <div className="text-sm">{selectedGroup?.contactEmail || "N/A"}</div>
                  </div>
                )}

                {selectedGroup.meetingId && (
                  <div className="space-y-2 col-span-2">
                    <Label>Meeting ID</Label>
                    <div className="text-xs font-mono text-muted-foreground">{selectedGroup.meetingId}</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>Enlaces Extraídos</Label>
                <div className="space-y-3">
                  {(selectedGroup?.allTransactions?.some((t) => t.googleMeetLink) ?? false) && (
                    <div className="flex items-center justify-between rounded-lg border bg-green-50 p-3">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-green-600" />
                        <span className="font-medium">Google Meet</span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={selectedGroup?.allTransactions?.find((t) => t.googleMeetLink)?.googleMeetLink ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir
                        </a>
                      </Button>
                    </div>
                  )}

                  {(selectedGroup?.allTransactions?.some((t) => t.rescheduleLink) ?? false) && (
                    <div className="flex items-center justify-between rounded-lg border bg-blue-50 p-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Link de Reagendar</span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={selectedGroup?.allTransactions?.find((t) => t.rescheduleLink)?.rescheduleLink ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir
                        </a>
                      </Button>
                    </div>
                  )}

                  {(selectedGroup?.allTransactions?.some((t) => t.cancelLink) ?? false) && (
                    <div className="flex items-center justify-between rounded-lg border bg-orange-50 p-3">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-orange-600" />
                        <span className="font-medium">Link de Cancelar</span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={selectedGroup?.allTransactions?.find((t) => t.cancelLink)?.cancelLink ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Button variant="outline" className="w-full bg-transparent" onClick={() => setShowDetailedView(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Ver Diálogo Completo ({selectedGroup?.allTransactions?.length ?? 0} pasos)
              </Button>
            </div>
          )}

          {selectedGroup && showDetailedView && (
            <ScrollArea className="h-[calc(90vh-140px)] pr-4">
              <div className="space-y-6 py-4">
                {(selectedGroup.allTransactions || []).map((transaction: any, index: number) => (
                  <Card key={transaction.id} className="overflow-hidden border-2">
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge variant="secondary" className="font-mono text-sm px-3 py-1">
                            Step {index + 1}
                          </Badge>
                          <span className="font-mono text-sm font-bold text-slate-900">{transaction.type}</span>
                          <Badge
                            variant={transaction.status === "SUCCESS" ? "default" : "destructive"}
                            className="px-3 py-1"
                          >
                            {transaction.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-600 font-mono whitespace-nowrap">
                          {transaction?.createdAt
                            ? format(new Date(transaction.createdAt), "HH:mm:ss.SSS", { locale: es })
                            : "N/A"}
                        </span>
                      </div>

                      {transaction.endpoint && (
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {transaction.httpMethod}
                          </Badge>
                          <span className="text-xs text-slate-600 font-mono">{transaction.endpoint}</span>
                        </div>
                      )}

                      {transaction.contactEmail && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <span className="font-semibold text-slate-700">Contact:</span>
                          <span className="text-slate-900 font-medium">{transaction.contactEmail}</span>
                        </div>
                      )}

                      {(transaction.googleMeetLink || transaction.rescheduleLink || transaction.cancelLink) && (
                        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200">
                          {transaction.googleMeetLink && (
                            <Badge className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1">
                              <CheckCircle2 className="h-3 w-3 mr-1.5" />
                              Google Meet
                            </Badge>
                          )}
                          {transaction.rescheduleLink && (
                            <Badge className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1">
                              <CheckCircle2 className="h-3 w-3 mr-1.5" />
                              Reagendar
                            </Badge>
                          )}
                          {transaction.cancelLink && (
                            <Badge className="text-xs bg-orange-600 hover:bg-orange-700 px-3 py-1">
                              <CheckCircle2 className="h-3 w-3 mr-1.5" />
                              Cancelar
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {(transaction.requestPayload || transaction.responsePayload) && (
                      <div className="p-6 bg-white">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePayload(transaction.id)}
                          className="mb-4 text-xs hover:bg-slate-100"
                        >
                          {expandedPayloads.has(transaction.id) ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Ocultar Payloads
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Ver Payloads
                            </>
                          )}
                        </Button>

                        {expandedPayloads.has(transaction.id) && (
                          <div className="space-y-4">
                            {transaction.requestPayload && (
                              <JsonTreeViewer data={transaction.requestPayload} label="Request Payload" />
                            )}
                            {transaction.responsePayload && (
                              <JsonTreeViewer data={transaction.responsePayload} label="Response Payload" />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
