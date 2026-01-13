"use client"

import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"
import { ChevronDown } from "lucide-react"

import useSWR from "swr"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, RefreshCw, RotateCcw, Trash2, AlertTriangle, History } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { ApiCallsResponse } from "@/types/api"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      return { calls: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } }
    }
    const json = await res.json()
    return {
      calls: Array.isArray(json.calls) ? json.calls : [],
      pagination: json.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 },
    }
  } catch (error) {
    console.error("[v0] Fetcher error:", error)
    return { calls: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 0 } }
  }
}

function safeFormatDate(dateValue: string | null | undefined, formatStr = "dd/MM/yyyy HH:mm:ss"): string {
  if (!dateValue) return "-"
  try {
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return "-"
    return format(date, formatStr, { locale: es })
  } catch {
    return "-"
  }
}

function safeGetTime(dateValue: string | null | undefined): number {
  if (!dateValue) return 0
  try {
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return 0
    return date.getTime()
  } catch {
    return 0
  }
}

export function LemonwayTransactionsList() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [successFilter, setSuccessFilter] = useState<string>("all")
  const [retryStatusFilter, setRetryStatusFilter] = useState<string>("all")
  const [retryCountFilter, setRetryCountFilter] = useState<string>("all")
  const [selectedCall, setSelectedCall] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [retryingLogId, setRetryingLogId] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRequeuing, setIsRequeuing] = useState(false)
  const [isMarkingOrphan, setIsMarkingOrphan] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [selectedHistoryLogId, setSelectedHistoryLogId] = useState<number | null>(null)
  const [retryHistory, setRetryHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [pollingIntervalSeconds, setPollingIntervalSeconds] = useState(3)
  const [processingGracePeriodSeconds, setProcessingGracePeriodSeconds] = useState(30)

  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<number, any>>(new Map())
  const [processingOptimistic, setProcessingOptimistic] = useState<Set<string>>(new Set())
  const [processingStartTimes, setProcessingStartTimes] = useState<Map<string, number>>(new Map())

  const processingGracePeriodMs = processingGracePeriodSeconds * 1000

  const queryParams = `page=${page}&limit=${limit}&success=${successFilter}&retryStatus=${retryStatusFilter}&retryCount=${retryCountFilter}`

  const { data, error, isLoading, mutate } = useSWR<ApiCallsResponse>(
    `/api/lemonway/api-calls?${queryParams}`,
    fetcher,
    {
      refreshInterval: 0,
      revalidateOnFocus: true,
      keepPreviousData: true,
    },
  )

  const calls = data?.calls ?? []

  const hasPendingTransactions = useMemo(() => {
    return calls.some(
      (call: any) =>
        call.retry_status === "limit_pending" ||
        call.retry_status === "pending" ||
        (call.next_retry_at && new Date(call.next_retry_at) > new Date()),
    )
  }, [calls])

  useEffect(() => {
    const fetchPollingInterval = async () => {
      try {
        const response = await fetch("/api/app-config/lemonway-retry")
        const settings = await response.json()
        if (settings.pollingIntervalSeconds) {
          setPollingIntervalSeconds(Math.max(1, settings.pollingIntervalSeconds))
        }
        if (settings.processingGracePeriodSeconds) {
          setProcessingGracePeriodSeconds(Math.max(5, settings.processingGracePeriodSeconds))
        }
      } catch (error) {
        console.error("[v0] Error fetching polling interval:", error)
      }
    }

    fetchPollingInterval()
  }, [])

  const displayData = useMemo(() => {
    if (!calls.length) {
      return {
        calls: [],
        pagination: data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 },
      }
    }

    const mergedCalls = calls.map((call: any) => {
      const optimistic = optimisticUpdates.get(call.id)
      return optimistic ? { ...call, ...optimistic } : call
    })

    return {
      calls: mergedCalls,
      pagination: data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 },
    }
  }, [calls, data?.pagination, optimisticUpdates])

  useEffect(() => {
    if (!hasPendingTransactions) return

    const interval = setInterval(() => {
      mutate()
    }, pollingIntervalSeconds * 1000)

    return () => clearInterval(interval)
  }, [hasPendingTransactions, pollingIntervalSeconds, mutate])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())

      const now = Date.now()
      const newProcessing = new Set<string>()

      calls.forEach((call: any) => {
        if ((call.retry_status === "limit_pending" || call.retry_status === "pending") && call.next_retry_at) {
          const retryTime = new Date(call.next_retry_at).getTime()
          if (now >= retryTime) {
            newProcessing.add(call.request_id)
          }
        }
      })

      if (newProcessing.size > 0) {
        setProcessingOptimistic((prev) => {
          const updated = new Set(prev)
          newProcessing.forEach((id) => updated.add(id))
          return updated
        })
        setProcessingStartTimes((prev) => {
          const updated = new Map(prev)
          newProcessing.forEach((id) => {
            if (!updated.has(id)) {
              updated.set(id, now)
            }
          })
          return updated
        })
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [calls])

  useEffect(() => {
    if (processingOptimistic.size > 0) {
      const now = Date.now()
      const stillProcessing = new Set<string>()
      const updatedStartTimes = new Map(processingStartTimes)

      processingOptimistic.forEach((id) => {
        const call = calls.find((c: any) => c.request_id === id)
        const startTime = processingStartTimes.get(id) || now
        const elapsedTime = now - startTime
        const isWithinGracePeriod = elapsedTime < processingGracePeriodMs

        if (call) {
          const hasServerResponse = call.response_status !== null && call.response_status !== undefined

          if (hasServerResponse) {
            updatedStartTimes.delete(id)
          } else if (isWithinGracePeriod) {
            stillProcessing.add(id)
          } else {
            const isPending = call.retry_status === "limit_pending" || call.retry_status === "pending"
            if (isPending && call.success === null) {
              stillProcessing.add(id)
            } else {
              updatedStartTimes.delete(id)
            }
          }
        } else {
          updatedStartTimes.delete(id)
        }
      })

      if (stillProcessing.size !== processingOptimistic.size) {
        setProcessingOptimistic(stillProcessing)
        setProcessingStartTimes(updatedStartTimes)
      }
    }
  }, [calls, processingOptimistic, processingStartTimes, processingGracePeriodMs])

  const getTimeUntilRetry = (nextRetryAt: string) => {
    const now = new Date()
    const nextRetry = new Date(nextRetryAt)
    const timeUntilRetry = Math.max(0, nextRetry.getTime() - now.getTime())
    const minutes = Math.floor(timeUntilRetry / (1000 * 60))
    const seconds = Math.floor((timeUntilRetry % (1000 * 60)) / 1000)
    return `${minutes}m ${seconds}s`
  }

  const handleViewDetails = (call: any) => {
    setSelectedCall(call)
    setIsDialogOpen(true)
  }

  const handleManualRetry = async (id: number) => {
    setRetryingLogId(id)
    try {
      const response = await fetch("/api/lemonway/manual-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Reintento manual iniciado")
        mutate()
      } else {
        toast.error(result.message || "Error al iniciar reintento manual")
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`)
    } finally {
      setRetryingLogId(null)
    }
  }

  const getProgressPercentage = useCallback(
    (call: any) => {
      if (!call.next_retry_at) return 0
      if (call.retry_status !== "limit_pending" && call.retry_status !== "pending") return 0

      const now = currentTime
      const nextRetry = safeGetTime(call.next_retry_at)
      const created = safeGetTime(call.created_at)
      const total = nextRetry - created
      const elapsed = now - created

      return Math.min(100, Math.max(0, (elapsed / total) * 100))
    },
    [currentTime],
  )

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("No hay transacciones seleccionadas")
      return
    }

    if (!confirm(`¿Estás seguro de que deseas marcar ${selectedIds.size} transacción(es) como eliminada(s)?`)) {
      return
    }

    const optimisticMap = new Map(optimisticUpdates)
    selectedIds.forEach((id) => {
      optimisticMap.set(id, { retry_status: "deleted" })
    })
    setOptimisticUpdates(optimisticMap)

    setIsDeleting(true)
    try {
      const response = await fetch("/api/lemonway/delete-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(`${result.deletedCount} transacción(es) marcada(s) como eliminada(s)`)
        setSelectedIds(new Set())
        setOptimisticUpdates(new Map())
        mutate()
      } else {
        setOptimisticUpdates(new Map())
        toast.error(result.error || "Error al eliminar transacciones")
      }
    } catch (error: any) {
      setOptimisticUpdates(new Map())
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkMarkOrphan = async () => {
    if (selectedIds.size === 0) {
      toast.error("No hay transacciones seleccionadas")
      return
    }

    if (!confirm(`¿Estás seguro de que deseas marcar ${selectedIds.size} transacción(es) como fallo final?`)) {
      return
    }

    const optimisticMap = new Map(optimisticUpdates)
    selectedIds.forEach((id) => {
      optimisticMap.set(id, { final_failure: true, retry_status: "failed" })
    })
    setOptimisticUpdates(optimisticMap)

    setIsMarkingOrphan(true)
    try {
      const response = await fetch("/api/lemonway/mark-orphan-failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })

      const result = await response.json()
      console.log("[v0] Mark Orphan result:", result)

      if (result.success || result.markedCount > 0) {
        toast.success(`${result.markedCount} transacción(es) marcada(s) como fallo final`)
        setSelectedIds(new Set())
        setOptimisticUpdates(new Map())
        mutate()
      } else {
        setOptimisticUpdates(new Map())
        toast.error(result.error || "Error al marcar transacciones")
      }
    } catch (error: any) {
      setOptimisticUpdates(new Map())
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsMarkingOrphan(false)
    }
  }

  const handleRequeue = async () => {
    setIsRequeuing(true)
    try {
      const response = await fetch("/api/lemonway/requeue-pending", {
        method: "POST",
      })

      const result = await response.json()
      console.log("[v0] Requeue result:", result)

      if (result.success) {
        toast.success(result.message || `${result.processed} transacción(es) procesada(s)`)
        mutate()
      } else {
        toast.error(result.error || "Error al reencolar transacciones")
      }
    } catch (error: any) {
      console.error("[v0] Requeue error:", error)
      toast.error(`Error: ${error.message}`)
    } finally {
      setIsRequeuing(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === displayData.calls.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayData.calls.map((call: any) => call.id)))
    }
  }

  const toggleSelect = (id: number) => {
    const newSelectedIds = new Set(selectedIds)
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id)
    } else {
      newSelectedIds.add(id)
    }
    setSelectedIds(newSelectedIds)
  }

  const selectedDeletableCount = useMemo(
    () =>
      Array.from(selectedIds).filter((id) => {
        const call = displayData.calls.find((call: any) => call.id === id)
        return call?.retry_status !== "deleted" && call?.final_failure !== true
      }).length,
    [selectedIds, displayData.calls],
  )

  const selectedOrphanCount = useMemo(
    () =>
      Array.from(selectedIds).filter((id) => {
        const call = displayData.calls.find((call: any) => call.id === id)
        return call?.retry_status !== "deleted" && call?.final_failure !== true
      }).length,
    [selectedIds, displayData.calls],
  )

  const handleViewHistory = async (logId: number) => {
    setSelectedHistoryLogId(logId)
    setHistoryDialogOpen(true)
    setLoadingHistory(true)

    try {
      const response = await fetch(`/api/lemonway/retry-history?logId=${logId}`)
      const result = await response.json()

      if (result.success) {
        setRetryHistory(result.history || [])
      } else {
        toast.error("Error al cargar historial")
        setRetryHistory([])
      }
    } catch (error) {
      toast.error("Error al cargar historial")
      setRetryHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const getSuccessBadge = (call: any) => {
    if (processingOptimistic.has(call.request_id)) {
      return <Badge className="bg-purple-100 text-purple-800">Procesando</Badge>
    }
    if (call.retry_status === "limit_pending" || call.retry_status === "pending") {
      return <Badge className="bg-blue-100 text-blue-800">Pendiente</Badge>
    }
    if (call.success === true) {
      return <Badge className="bg-green-100 text-green-800">Exitosa</Badge>
    }
    if (call.success === false) {
      return <Badge className="bg-red-100 text-red-800">Fallida</Badge>
    }
    return <Badge className="bg-gray-100 text-gray-800">Desconocido</Badge>
  }

  const getRetryStatusBadge = (call: any) => {
    if (processingOptimistic.has(call.request_id)) {
      return <Badge className="bg-purple-100 text-purple-800">PROCESANDO</Badge>
    }
    if (call.retry_status === "deleted") {
      return <Badge className="bg-gray-100 text-gray-600">ELIMINADA</Badge>
    }
    if (call.final_failure) {
      return <Badge variant="destructive">Fallo Final</Badge>
    }
    if (call.retry_status === "limit_pending") {
      return <Badge className="bg-blue-100 text-blue-800">EN COLA</Badge>
    }
    if (call.retry_status === "pending") {
      return <Badge className="bg-yellow-100 text-yellow-800">PENDING</Badge>
    }
    if (call.retry_status === "success") {
      return <Badge className="bg-green-100 text-green-800">REINTENTO OK</Badge>
    }
    if (call.retry_status === "processing") {
      return <Badge className="bg-purple-100 text-purple-800">PROCESANDO</Badge>
    }
    if (call.retry_status === "none" || !call.retry_status) {
      return <Badge variant="outline">NONE</Badge>
    }
    return <Badge variant="outline">{call.retry_status?.toUpperCase() || "NONE"}</Badge>
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>No se pudieron cargar las llamadas API</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              Llamadas API Lemonway ({displayData.pagination.total} total)
              {selectedIds.size > 0 && ` - ${selectedIds.size} seleccionada(s)`}
            </CardTitle>
            <CardDescription>
              Registro completo de peticiones y respuestas al API de Lemonway
              {hasPendingTransactions && (
                <span className="ml-2 text-blue-600">(Actualizando cada {pollingIntervalSeconds}s)</span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtros</span>
            <span className="text-sm font-medium">Estado</span>
            <Select
              value={successFilter}
              onValueChange={(value) => {
                setSuccessFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="true">Exitosas</SelectItem>
                <SelectItem value="false">Fallidas</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Estado Reintento</span>
            <Select
              value={retryStatusFilter}
              onValueChange={(value) => {
                setRetryStatusFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="limit_pending">En Cola</SelectItem>
                <SelectItem value="none">Sin Reintento</SelectItem>
                <SelectItem value="success">Reintento OK</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
                <SelectItem value="deleted">Eliminadas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Reintentos</span>
            <Select
              value={retryCountFilter}
              onValueChange={(value) => {
                setRetryCountFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Registros por página</span>
            <Select
              value={limit.toString()}
              onValueChange={(value) => {
                setLimit(Number(value))
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 registros</SelectItem>
                <SelectItem value="25">25 registros</SelectItem>
                <SelectItem value="50">50 registros</SelectItem>
                <SelectItem value="100">100 registros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={handleRequeue} disabled={isRequeuing}>
              <RotateCcw className={`h-4 w-4 mr-2 ${isRequeuing ? "animate-spin" : ""}`} />
              Reencolar Pendientes
            </Button>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-4 flex gap-2 p-2 bg-muted rounded-md">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isDeleting || selectedDeletableCount === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar ({selectedDeletableCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkMarkOrphan}
              disabled={isMarkingOrphan || selectedOrphanCount === 0}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Marcar Fallo Final ({selectedOrphanCount})
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={displayData.calls.length > 0 && selectedIds.size === displayData.calls.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Fecha/Hora Envío</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Estado Reintento</TableHead>
                  <TableHead>Total Reintentos</TableHead>
                  <TableHead>Próximo Intento</TableHead>
                  <TableHead>HTTP Status</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayData.calls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center text-muted-foreground py-8">
                      No se encontraron llamadas API
                    </TableCell>
                  </TableRow>
                ) : (
                  displayData.calls.map((call: any) => {
                    const isOptimisticProcessing = processingOptimistic.has(call.request_id)
                    const isPending =
                      !isOptimisticProcessing &&
                      (call.retry_status === "limit_pending" || call.retry_status === "pending")
                    const isProcessing = isOptimisticProcessing || call.retry_status === "processing"
                    const progress = isOptimisticProcessing ? 100 : getProgressPercentage(call)
                    const displayRetries = isPending ? 0 : call.total_retries || 0

                    return (
                      <TableRow
                        key={call.id}
                        className={`
                          ${isPending ? "bg-blue-50/50" : ""}
                          ${isProcessing ? "animate-pulse bg-purple-50/50" : ""}
                          transition-all duration-300
                        `}
                      >
                        <TableCell>
                          <Checkbox checked={selectedIds.has(call.id)} onCheckedChange={() => toggleSelect(call.id)} />
                        </TableCell>
                        <TableCell className="font-mono text-sm">#{call.request_id || call.id}</TableCell>
                        <TableCell className="text-sm">{safeFormatDate(call.created_at)}</TableCell>
                        <TableCell className="text-sm">{safeFormatDate(call.sent_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{call.method}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">{call.endpoint}</TableCell>
                        <TableCell>{getSuccessBadge(call)}</TableCell>
                        <TableCell>{getRetryStatusBadge(call)}</TableCell>
                        <TableCell className="text-center">{displayRetries}</TableCell>
                        <TableCell>
                          {call.next_retry_at && isPending ? (
                            <div className="space-y-1">
                              <span className="text-xs">{getTimeUntilRetry(call.next_retry_at)}</span>
                              <Progress value={progress} className="h-1 w-20" />
                            </div>
                          ) : isOptimisticProcessing ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin text-purple-600" />
                              <span className="text-xs text-purple-600">Enviando...</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {call.response_status ? (
                            <Badge
                              variant={
                                call.response_status >= 200 && call.response_status < 300 ? "default" : "destructive"
                              }
                            >
                              {call.response_status}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{call.duration_ms ? `${call.duration_ms}ms` : "-"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleViewDetails(call)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleViewHistory(call.id)}>
                              <History className="h-4 w-4" />
                            </Button>
                            {call.final_failure && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleManualRetry(call.id)}
                                disabled={retryingLogId === call.id}
                              >
                                <RefreshCw className={`h-4 w-4 ${retryingLogId === call.id ? "animate-spin" : ""}`} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {displayData.pagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            disabled={page >= (displayData.pagination.totalPages || 1)}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Llamada #{selectedCall?.request_id || selectedCall?.id}</DialogTitle>
            <DialogDescription>{selectedCall && safeFormatDate(selectedCall.created_at)}</DialogDescription>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Endpoint</h4>
                  <code className="text-sm bg-muted p-2 rounded block">
                    {selectedCall.method} {selectedCall.endpoint}
                  </code>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Estado</h4>
                  <div className="flex gap-2">
                    {getSuccessBadge(selectedCall)}
                    {getRetryStatusBadge(selectedCall)}
                  </div>
                </div>
              </div>

              {selectedCall.request_payload && (
                <div>
                  <h4 className="font-semibold mb-1">Request Payload</h4>
                  <pre className="text-sm bg-muted p-2 rounded whitespace-pre-wrap">
                    {JSON.stringify(selectedCall.request_payload, null, 2)}
                  </pre>
                </div>
              )}

              {selectedCall.response_payload && (
                <div>
                  <h4 className="font-semibold mb-1">Response Payload</h4>
                  <pre className="text-sm bg-muted p-2 rounded whitespace-pre-wrap">
                    {JSON.stringify(selectedCall.response_payload, null, 2)}
                  </pre>
                </div>
              )}

              {selectedCall.error_message && (
                <div>
                  <h4 className="font-semibold mb-1 text-red-600">Error</h4>
                  <pre className="text-sm bg-red-50 p-2 rounded whitespace-pre-wrap">{selectedCall.error_message}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Reintentos #{selectedHistoryLogId}</DialogTitle>
            <DialogDescription>Registro de todos los intentos realizados para esta petición</DialogDescription>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : retryHistory.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay historial de reintentos</p>
          ) : (
            <div className="space-y-3">
              {retryHistory.map((entry: any, index: number) => (
                <Collapsible key={entry.id || index} defaultOpen={index === retryHistory.length - 1}>
                  <div className="border rounded-lg">
                    <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">Intento #{entry.attempt_number}</span>
                        <Badge variant={entry.success ? "default" : "destructive"}>
                          {entry.success ? "Éxito" : "Fallido"}
                        </Badge>
                        {entry.response_status && <Badge variant="outline">HTTP {entry.response_status}</Badge>}
                        {entry.duration_ms && <Badge variant="outline">{entry.duration_ms}ms</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{safeFormatDate(entry.created_at)}</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-2 border-t pt-2">
                        {entry.error_message && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Mensaje de Error:</span>
                            <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1 break-all">
                              {entry.error_message}
                            </p>
                          </div>
                        )}
                        {entry.response_payload && (
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Response Payload:</span>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-64 overflow-y-auto">
                              {typeof entry.response_payload === "string"
                                ? entry.response_payload
                                : JSON.stringify(entry.response_payload, null, 2)}
                            </pre>
                          </div>
                        )}
                        {!entry.error_message && !entry.response_payload && (
                          <p className="text-sm text-muted-foreground italic">Sin datos adicionales</p>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default LemonwayTransactionsList
