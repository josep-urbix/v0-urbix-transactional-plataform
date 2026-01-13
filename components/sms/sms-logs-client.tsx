"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Eye,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
} from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SMSLogsClient() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    status: "all",
    phone: "",
    template_key: "",
    from_date: "",
    to_date: "",
  })
  const [selectedLog, setSelectedLog] = useState<any>(null)

  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: "25",
    ...(filters.status !== "all" && { status: filters.status }),
    ...(filters.phone && { phone: filters.phone }),
    ...(filters.template_key && { template_key: filters.template_key }),
    ...(filters.from_date && { from_date: filters.from_date }),
    ...(filters.to_date && { to_date: filters.to_date }),
  })

  const { data, error, isLoading, mutate } = useSWR(`/api/admin/sms/logs?${queryParams}`, fetcher, {
    refreshInterval: 30000,
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Send className="h-4 w-4 text-blue-500" />
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "simulated":
        return <FlaskConical className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      sent: "bg-blue-100 text-blue-800",
      delivered: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      simulated: "bg-purple-100 text-purple-800",
    }

    const labels: Record<string, string> = {
      sent: "Enviado",
      delivered: "Entregado",
      failed: "Fallido",
      pending: "Pendiente",
      simulated: "Simulado",
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}
      >
        {getStatusIcon(status)}
        {labels[status] || status}
      </span>
    )
  }

  const handleSearch = () => {
    setPage(1)
    mutate()
  }

  const clearFilters = () => {
    setFilters({
      status: "all",
      phone: "",
      template_key: "",
      from_date: "",
      to_date: "",
    })
    setPage(1)
  }

  if (isLoading) {
    return <div className="text-[#777777]">Cargando logs de SMS...</div>
  }

  if (error) {
    return <div className="text-red-600">Error al cargar logs: {error.message}</div>
  }

  const { logs = [], pagination, stats } = data || {}

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="p-4 bg-white border-[#E6E6E6]">
          <p className="text-xs text-[#777777]">Total</p>
          <p className="text-2xl font-bold text-[#164AA6]">{stats?.total || 0}</p>
        </Card>
        <Card className="p-4 bg-white border-[#E6E6E6]">
          <p className="text-xs text-[#777777]">Enviados</p>
          <p className="text-2xl font-bold text-blue-600">{stats?.sent || 0}</p>
        </Card>
        <Card className="p-4 bg-white border-[#E6E6E6]">
          <p className="text-xs text-[#777777]">Entregados</p>
          <p className="text-2xl font-bold text-green-600">{stats?.delivered || 0}</p>
        </Card>
        <Card className="p-4 bg-white border-[#E6E6E6]">
          <p className="text-xs text-[#777777]">Fallidos</p>
          <p className="text-2xl font-bold text-red-600">{stats?.failed || 0}</p>
        </Card>
        <Card className="p-4 bg-white border-[#E6E6E6]">
          <p className="text-xs text-[#777777]">Simulados</p>
          <p className="text-2xl font-bold text-purple-600">{stats?.simulated || 0}</p>
        </Card>
        <Card className="p-4 bg-white border-[#E6E6E6]">
          <p className="text-xs text-[#777777]">Últimas 24h</p>
          <p className="text-2xl font-bold text-[#164AA6]">{stats?.last_24h || 0}</p>
        </Card>
        <Card className="p-4 bg-white border-[#E6E6E6]">
          <p className="text-xs text-[#777777]">Últimos 7d</p>
          <p className="text-2xl font-bold text-[#164AA6]">{stats?.last_7d || 0}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 bg-white border-[#E6E6E6]">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <Label className="text-xs">Estado</Label>
            <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="simulated">Simulado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Teléfono</Label>
            <Input
              placeholder="Buscar teléfono..."
              value={filters.phone}
              onChange={(e) => setFilters({ ...filters, phone: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Plantilla</Label>
            <Input
              placeholder="Key de plantilla..."
              value={filters.template_key}
              onChange={(e) => setFilters({ ...filters, template_key: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Desde</Label>
            <Input
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">Hasta</Label>
            <Input
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleSearch} className="bg-[#164AA6] hover:bg-[#164AA6]/90">
              <Search className="h-4 w-4 mr-1" />
              Buscar
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar
            </Button>
            <Button variant="ghost" onClick={() => mutate()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="bg-white border-[#E6E6E6]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E6E6E6]">
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Fecha</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Teléfono</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Plantilla</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Mensaje</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Estado</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-[#E6E6E6] hover:bg-[#F2F2F2]">
                  <td className="py-3 px-4 text-sm text-[#777777]">
                    {new Date(log.created_at).toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono text-[#164AA6]">{log.recipient_phone}</td>
                  <td className="py-3 px-4 text-sm text-[#777777]">
                    <span className="font-mono text-xs bg-[#F2F2F2] px-2 py-1 rounded">{log.template_key}</span>
                    {log.template_name && (
                      <span className="block text-xs text-[#999999] mt-1">{log.template_name}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#777777] max-w-xs truncate">{log.message_body}</td>
                  <td className="py-3 px-4">{getStatusBadge(log.status)}</td>
                  <td className="py-3 px-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="text-[#164AA6] hover:text-[#164AA6] hover:bg-[#164AA6]/10"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Detalle del SMS</DialogTitle>
                          <DialogDescription>Información completa del mensaje enviado</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-[#777777]">ID</Label>
                              <p className="font-mono text-sm">{log.id}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-[#777777]">Fecha</Label>
                              <p className="text-sm">{new Date(log.created_at).toLocaleString("es-ES")}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-[#777777]">Teléfono</Label>
                              <p className="font-mono text-sm">{log.recipient_phone}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-[#777777]">Estado</Label>
                              <div className="mt-1">{getStatusBadge(log.status)}</div>
                            </div>
                            <div>
                              <Label className="text-xs text-[#777777]">Plantilla</Label>
                              <p className="font-mono text-sm">{log.template_key}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-[#777777]">Proveedor ID</Label>
                              <p className="font-mono text-sm">{log.provider_message_id || "-"}</p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-[#777777]">Mensaje</Label>
                            <div className="mt-1 p-3 bg-[#F2F2F2] rounded-lg">
                              <p className="text-sm whitespace-pre-wrap">{log.message_body}</p>
                              <p className="text-xs text-[#999999] mt-2">
                                {log.message_body?.length || 0} caracteres |{" "}
                                {Math.ceil((log.message_body?.length || 0) / 160)} segmento(s)
                              </p>
                            </div>
                          </div>
                          {log.error_message && (
                            <div>
                              <Label className="text-xs text-red-600">Error</Label>
                              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{log.error_message}</p>
                            </div>
                          )}
                          {log.provider_response && (
                            <div>
                              <Label className="text-xs text-[#777777]">Respuesta del Proveedor</Label>
                              <pre className="mt-1 p-3 bg-[#F2F2F2] rounded-lg text-xs overflow-auto max-h-40">
                                {JSON.stringify(log.provider_response, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#777777]">
                    No hay logs de SMS
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E6E6E6]">
            <p className="text-sm text-[#777777]">
              Mostrando {(page - 1) * pagination.limit + 1} - {Math.min(page * pagination.limit, pagination.total)} de{" "}
              {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center px-3 text-sm">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pagination.totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
