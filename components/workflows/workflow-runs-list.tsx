"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Ban,
  ChevronRight,
  Play,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WorkflowRun, WorkflowRunStatus } from "@/lib/types/workflow"

interface WorkflowRunsListProps {
  workflowId: string
  workflowName?: string
}

const STATUS_CONFIG: Record<WorkflowRunStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  PENDING: { label: "Pendiente", icon: Clock, color: "bg-gray-100 text-gray-700" },
  RUNNING: { label: "Ejecutando", icon: Loader2, color: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Completado", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  FAILED: { label: "Fallido", icon: XCircle, color: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelado", icon: Ban, color: "bg-gray-100 text-gray-600" },
  WAITING: { label: "Esperando", icon: Clock, color: "bg-amber-100 text-amber-700" },
}

export function WorkflowRunsList({ workflowId, workflowName }: WorkflowRunsListProps) {
  const router = useRouter()
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [offset, setOffset] = useState(0)
  const limit = 25

  useEffect(() => {
    fetchRuns()
  }, [workflowId, statusFilter, offset])

  async function fetchRuns() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.set("status", statusFilter)
      params.set("limit", limit.toString())
      params.set("offset", offset.toString())

      const response = await fetch(`/api/workflows/${workflowId}/runs?${params}`)
      const data = await response.json()

      setRuns(data.runs || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Error fetching runs:", error)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  function formatDuration(start: string, end: string | null) {
    if (!end) return "-"
    const duration = new Date(end).getTime() - new Date(start).getTime()
    if (duration < 1000) return `${duration}ms`
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`
    return `${(duration / 60000).toFixed(1)}m`
  }

  function StatusBadge({ status }: { status: WorkflowRunStatus }) {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon

    return (
      <Badge variant="secondary" className={`gap-1 ${config.color}`}>
        <Icon className={`h-3 w-3 ${status === "RUNNING" ? "animate-spin" : ""}`} />
        {config.label}
      </Badge>
    )
  }

  // Stats
  const completedCount = runs.filter((r) => r.status === "COMPLETED").length
  const failedCount = runs.filter((r) => r.status === "FAILED").length
  const runningCount = runs.filter((r) => r.status === "RUNNING" || r.status === "WAITING").length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/workflows/${workflowId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ejecuciones</h1>
            {workflowName && <p className="text-muted-foreground">{workflowName}</p>}
          </div>
        </div>
        <Button variant="outline" onClick={fetchRuns} className="gap-2 bg-transparent">
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card key="total">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card key="completed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>
        <Card key="failed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fallidos</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
          </CardContent>
        </Card>
        <Card key="running">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En proceso</CardTitle>
            <Loader2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{runningCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="COMPLETED">Completado</SelectItem>
                <SelectItem value="FAILED">Fallido</SelectItem>
                <SelectItem value="RUNNING">Ejecutando</SelectItem>
                <SelectItem value="WAITING">Esperando</SelectItem>
                <SelectItem value="PENDING">Pendiente</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Runs Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay ejecuciones registradas
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => (
                <TableRow
                  key={run.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/workflows/${workflowId}/runs/${run.id}`)}
                >
                  <TableCell className="font-mono text-xs">{run.id.slice(0, 8)}...</TableCell>
                  <TableCell>
                    <StatusBadge status={run.status} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{run.trigger_event_name}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(run.started_at)}</TableCell>
                  <TableCell className="text-sm">{run.finished_at ? formatDate(run.finished_at) : "-"}</TableCell>
                  <TableCell className="text-sm">{formatDuration(run.started_at, run.finished_at)}</TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Mostrando {offset + 1} - {Math.min(offset + limit, total)} de {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(offset - limit)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
