"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface CallRecord {
  id: string
  method_name: string
  request_payload: any
  response_payload: any
  status_code: number
  duration_ms: number
  success: boolean
  error_message: string | null
  created_at: string
  user_email: string
}

interface CallHistoryProps {
  methodId: string
  refreshTrigger?: number
}

export function LemonwayCallHistory({ methodId, refreshTrigger }: CallHistoryProps) {
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    success: "",
    date_from: "",
    date_to: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchHistory()
  }, [methodId, page, refreshTrigger])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        method_id: methodId,
        page: page.toString(),
        limit: "10",
        ...filters,
      })

      const res = await fetch(`/api/lemonway-api/history?${params}`)
      if (!res.ok) throw new Error("Error al cargar historial")

      const data = await res.json()
      setCalls(Array.isArray(data.calls) ? data.calls : [])
      setTotalPages(data.pagination?.total_pages || 1)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      setCalls([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    setPage(1)
    fetchHistory()
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading && calls.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <select
                value={filters.success}
                onChange={(e) => setFilters({ ...filters, success: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Todos</option>
                <option value="true">Éxito</option>
                <option value="false">Error</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Fecha desde</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha hasta</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
          </div>

          <Button onClick={handleFilter} className="w-full">
            Aplicar Filtros
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Llamadas ({calls?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!calls || calls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay llamadas registradas para este método</div>
          ) : (
            calls.map((call) => (
              <div key={call.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {call.success ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Éxito
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
                      <Badge variant="outline">Status {call.status_code}</Badge>
                      <Badge variant="secondary">{call.duration_ms}ms</Badge>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>Usuario:</strong> {call.user_email}
                      </p>
                      <p>
                        <strong>Fecha:</strong> {format(new Date(call.created_at), "PPpp", { locale: es })}
                      </p>
                      {call.error_message && (
                        <p className="text-destructive">
                          <strong>Error:</strong> {call.error_message}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => toggleExpand(call.id)}>
                    {expandedId === call.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                {expandedId === call.id && (
                  <div className="space-y-3 mt-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label>Request</Label>
                      <Textarea
                        value={JSON.stringify(call.request_payload, null, 2)}
                        readOnly
                        className="font-mono text-xs min-h-[150px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Response</Label>
                      <Textarea
                        value={JSON.stringify(call.response_payload, null, 2)}
                        readOnly
                        className="font-mono text-xs min-h-[150px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
