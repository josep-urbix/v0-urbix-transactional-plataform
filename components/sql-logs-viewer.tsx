"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RefreshCw, Database, Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface SQLLog {
  id: number
  query: string
  params: any
  execution_time_ms: number
  rows_affected: number
  status: string
  error_message: string | null
  api_endpoint: string | null
  user_email: string | null
  ip_address: string | null
  createdAt: string
}

interface SQLStats {
  total_queries: number
  successful_queries: number
  failed_queries: number
  avg_execution_time: number
  max_execution_time: number
  min_execution_time: number
}

export function SQLLogsViewer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedLog, setSelectedLog] = useState<SQLLog | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const page = Number.parseInt(searchParams.get("page") || "1")
  const pageSize = Number.parseInt(searchParams.get("pageSize") || "50")
  const status = searchParams.get("status") || ""
  const apiEndpoint = searchParams.get("apiEndpoint") || ""
  const userEmail = searchParams.get("userEmail") || ""
  const from = searchParams.get("from") || ""
  const to = searchParams.get("to") || ""

  const queryString = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...(status && { status }),
    ...(apiEndpoint && { apiEndpoint }),
    ...(userEmail && { userEmail }),
    ...(from && { from }),
    ...(to && { to }),
  }).toString()

  const { data, error, mutate } = useSWR(`/api/sql-logs?${queryString}`, fetcher, {
    refreshInterval: 10000, // Auto-refresh every 10 seconds
  })

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set("page", "1") // Reset to first page
    router.push(`/dashboard/sql-logs?${params.toString()}`)
  }

  const handleRefresh = () => {
    mutate()
  }

  const handleViewDetails = (log: SQLLog) => {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }

  const stats: SQLStats = data?.stats || {}
  const logs: SQLLog[] = data?.items || []
  const totalPages = data?.totalPages || 0

  const totalQueries = Number(stats.total_queries) || 0
  const successfulQueries = Number(stats.successful_queries) || 0
  const failedQueries = Number(stats.failed_queries) || 0
  const avgExecutionTime = Number(stats.avg_execution_time) || 0
  const maxExecutionTime = Number(stats.max_execution_time) || 0
  const minExecutionTime = Number(stats.min_execution_time) || 0

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-medium text-muted-foreground">Total Queries</div>
          </div>
          <div className="text-2xl font-bold">{totalQueries}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div className="text-sm font-medium text-muted-foreground">Exitosas</div>
          </div>
          <div className="text-2xl font-bold text-green-600">{successfulQueries}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <div className="text-sm font-medium text-muted-foreground">Fallidas</div>
          </div>
          <div className="text-2xl font-bold text-red-600">{failedQueries}</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-medium text-muted-foreground">Tiempo Promedio</div>
          </div>
          <div className="text-2xl font-bold">{avgExecutionTime.toFixed(2)} ms</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filtros</h3>
            <Button size="sm" variant="outline" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label htmlFor="status-filter" className="text-sm font-medium">
                Estado
              </label>
              <Select value={status} onValueChange={(v) => handleFilterChange("status", v)}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Exitoso</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="api-endpoint-filter" className="text-sm font-medium">
                API Endpoint
              </label>
              <Input
                id="api-endpoint-filter"
                placeholder="Buscar endpoint..."
                value={apiEndpoint}
                onChange={(e) => handleFilterChange("apiEndpoint", e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="user-email-filter" className="text-sm font-medium">
                Usuario
              </label>
              <Input
                id="user-email-filter"
                placeholder="Email del usuario..."
                value={userEmail}
                onChange={(e) => handleFilterChange("userEmail", e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="page-size-filter" className="text-sm font-medium">
                Registros por página
              </label>
              <Select value={pageSize.toString()} onValueChange={(v) => handleFilterChange("pageSize", v)}>
                <SelectTrigger id="page-size-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 registros</SelectItem>
                  <SelectItem value="50">50 registros</SelectItem>
                  <SelectItem value="100">100 registros</SelectItem>
                  <SelectItem value="200">200 registros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">Timestamp</th>
                <th className="p-3 text-left text-sm font-medium">Estado</th>
                <th className="p-3 text-left text-sm font-medium">Query</th>
                <th className="p-3 text-left text-sm font-medium">Endpoint</th>
                <th className="p-3 text-left text-sm font-medium">Usuario</th>
                <th className="p-3 text-left text-sm font-medium">Tiempo (ms)</th>
                <th className="p-3 text-left text-sm font-medium">Filas</th>
                <th className="p-3 text-left text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No se encontraron logs SQL
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/50">
                    <td className="p-3 text-sm">{new Date(log.createdAt).toLocaleString("es-ES")}</td>
                    <td className="p-3">
                      {log.status === "success" ? (
                        <Badge variant="default" className="bg-green-600">
                          Exitoso
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </td>
                    <td className="p-3 text-sm font-mono">
                      <div className="max-w-md truncate">{log.query}</div>
                    </td>
                    <td className="p-3 text-sm">{log.api_endpoint || "-"}</td>
                    <td className="p-3 text-sm">{log.user_email || "-"}</td>
                    <td className="p-3 text-sm font-mono">{Number(log.execution_time_ms).toFixed(2)}</td>
                    <td className="p-3 text-sm">{log.rows_affected}</td>
                    <td className="p-3">
                      <Button size="sm" variant="outline" onClick={() => handleViewDetails(log)}>
                        Ver Detalles
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-4">
            <div className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => handleFilterChange("page", (page - 1).toString())}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => handleFilterChange("page", (page + 1).toString())}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles de la Transacción SQL</DialogTitle>
            <DialogDescription>
              ID: {selectedLog?.id} | {new Date(selectedLog?.createdAt || "").toLocaleString("es-ES")}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold mb-2">Estado</div>
                {selectedLog.status === "success" ? (
                  <Badge variant="default" className="bg-green-600">
                    Exitoso
                  </Badge>
                ) : (
                  <Badge variant="destructive">Error</Badge>
                )}
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Query SQL</div>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">{selectedLog.query}</pre>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2">Parámetros</div>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">
                  {JSON.stringify(selectedLog.params, null, 2)}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-semibold mb-2">Tiempo de Ejecución</div>
                  <div className="text-lg font-mono">{Number(selectedLog.execution_time_ms).toFixed(3)} ms</div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">Filas Afectadas</div>
                  <div className="text-lg font-mono">{selectedLog.rows_affected}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">API Endpoint</div>
                  <div className="text-sm">{selectedLog.api_endpoint || "N/A"}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">Usuario</div>
                  <div className="text-sm">{selectedLog.user_email || "N/A"}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold mb-2">IP Address</div>
                  <div className="text-sm">{selectedLog.ip_address || "N/A"}</div>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <div className="text-sm font-semibold mb-2 text-red-600">Mensaje de Error</div>
                  <pre className="bg-red-50 border border-red-200 p-4 rounded-md overflow-x-auto text-sm text-red-800">
                    {selectedLog.error_message}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
