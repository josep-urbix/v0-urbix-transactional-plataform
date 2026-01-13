"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Webhook,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Eye,
} from "lucide-react"
import type { WebhookDelivery, WebhookStats, ProcessingStatus, EventType } from "@/lib/types/lemonway-webhook"

interface WebhookListResponse {
  webhooks: WebhookDelivery[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: WebhookStats
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  BLOCKED_ACCOUNT_STATUS_CHANGE: "Cuenta Bloqueada",
  WALLET_STATUS_CHANGE: "Estado Wallet",
  MONEY_IN_WIRE: "Money-In Wire",
  MONEY_IN_SDD: "Money-In SDD",
  MONEY_IN_CHEQUE: "Money-In Cheque",
  MONEY_IN_CARD_SUBSCRIPTION: "Money-In Card",
  MONEY_IN_SOFORT: "Money-In Sofort",
  MONEY_IN_CHARGEBACK: "Chargeback Money-In",
  MONEY_IN_CHEQUE_CANCELED: "Cheque Cancelado",
  MONEY_IN_SDD_CANCELED: "SDD Cancelado",
  MONEY_OUT_STATUS: "Money-Out Status",
  MONEY_OUT_CANCELLED: "Money-Out Cancelado",
  DOCUMENT_STATUS_CHANGE: "Estado Documento",
  CHARGEBACK: "Chargeback",
  UNKNOWN: "Desconocido",
}

const NOTIF_CATEGORIES = [
  { value: "8", label: "8 - Wallet Status" },
  { value: "9", label: "9 - Document Status" },
  { value: "10", label: "10 - Money-In Wire" },
  { value: "11", label: "11 - Money-In SDD" },
  { value: "12", label: "12 - Money-In Cheque" },
  { value: "13", label: "13 - Blocked Account" },
  { value: "14", label: "14 - Chargeback" },
  { value: "15", label: "15 - Money-Out Cancelled" },
  { value: "17", label: "17 - SDD Canceled" },
  { value: "22", label: "22 - Card Subscription" },
  { value: "45", label: "45 - Cheque Canceled" },
  { value: "48", label: "48 - Sofort" },
]

export function LemonwayWebhooksList() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<WebhookListResponse | null>(null)
  const [page, setPage] = useState(1)
  const [limit] = useState(25)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")

  const fetchWebhooks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter)
      }
      if (categoryFilter && categoryFilter !== "all") {
        params.set("notif_category", categoryFilter)
      }
      if (search) {
        params.set("search", search)
      }

      const response = await fetch(`/api/admin/lemonway/webhooks?${params}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching webhooks:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWebhooks()
  }, [page, statusFilter, categoryFilter, search])

  const handleSearch = () => {
    setPage(1)
    setSearch(searchInput)
  }

  const clearFilters = () => {
    setStatusFilter("all")
    setCategoryFilter("all")
    setSearch("")
    setSearchInput("")
    setPage(1)
  }

  const getStatusBadge = (status: ProcessingStatus) => {
    switch (status) {
      case "PROCESSED":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Procesado
          </Badge>
        )
      case "FAILED":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Fallido
          </Badge>
        )
      case "PROCESSING":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Procesando
          </Badge>
        )
      case "RECEIVED":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatAmount = (amount: number | null) => {
    if (amount === null) return "-"
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhook Lemonway</h1>
          <p className="text-muted-foreground">Gestión de webhooks entrantes de Lemonway</p>
        </div>
        <Button onClick={fetchWebhooks} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{data.stats.total_webhooks}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{data.stats.pending_count}</div>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{data.stats.processing_count}</div>
              <p className="text-xs text-muted-foreground">Procesando</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{data.stats.processed_count}</div>
              <p className="text-xs text-muted-foreground">Procesados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{data.stats.failed_count}</div>
              <p className="text-xs text-muted-foreground">Fallidos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{data.stats.last_24h_count}</div>
              <p className="text-xs text-muted-foreground">Últimas 24h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{data.stats.failed_24h_count}</div>
              <p className="text-xs text-muted-foreground">Fallidos 24h</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por wallet o transacción..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} variant="secondary">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="RECEIVED">Pendiente</SelectItem>
                <SelectItem value="PROCESSING">Procesando</SelectItem>
                <SelectItem value="PROCESSED">Procesado</SelectItem>
                <SelectItem value="FAILED">Fallido</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="NotifCategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {NOTIF_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recibido</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Transacción</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Procesado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : data?.webhooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <Webhook className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No se encontraron webhooks
                  </TableCell>
                </TableRow>
              ) : (
                data?.webhooks.map((webhook) => (
                  <TableRow
                    key={webhook.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/dashboard/lemonway-webhooks/${webhook.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{formatDate(webhook.received_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{webhook.notif_category}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{EVENT_TYPE_LABELS[webhook.event_type] || webhook.event_type}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {webhook.wallet_ext_id || webhook.wallet_int_id || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{webhook.transaction_id || "-"}</TableCell>
                    <TableCell>{formatAmount(webhook.amount)}</TableCell>
                    <TableCell>{getStatusBadge(webhook.processing_status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {webhook.processed_at ? formatDate(webhook.processed_at) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/lemonway-webhooks/${webhook.id}`)
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {data.webhooks.length} de {data.pagination.total} webhooks
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <span className="text-sm">
              Página {page} de {data.pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pagination.totalPages}
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
