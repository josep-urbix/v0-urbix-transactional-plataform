"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Eye, AlertCircle, Loader2, Filter, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { TempMovimientosActions } from "./temp-movimientos-actions"
import { TempMovimientosEditDialog } from "./temp-movimientos-edit-dialog"

interface TempMovimiento {
  id: string
  import_run_id: string
  lemonway_transaction_id: string
  urbix_account_id: string | null
  cuenta_virtual_id: string | null
  monto: number
  commission: number
  tipo_transaccion: string
  tipo_operacion_id: string | null
  status: number | null
  descripcion: string | null
  sender: string | null
  receiver: string | null
  payment_method: string | null
  fecha_operacion: string | null
  procesado: boolean
  estado_importacion: string
  referencia_externa: string | null
  lemonway_raw_data: any
  created_at: string
  estado_revision: string | null
  revisado_por: string | null
  revisado_at: string | null
}

export function LemonwayTempMovimientos() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [importRunId, setImportRunId] = useState<string>("")
  const [movimientos, setMovimientos] = useState<TempMovimiento[]>([])
  const [filteredMovimientos, setFilteredMovimientos] = useState<TempMovimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMovimiento, setSelectedMovimiento] = useState<TempMovimiento | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    estadoRevision: "todos",
    estadoImportacion: "todos",
    tipoTransaccion: "todos",
    montoMin: "",
    montoMax: "",
    fechaDesde: "",
    fechaHasta: "",
    searchText: "",
  })

  useEffect(() => {
    const runId = searchParams.get("importRunId") || ""
    setImportRunId(runId)
  }, [searchParams])

  const fetchMovimientos = async () => {
    try {
      setLoading(true)
      let url = `/api/lemonway/movimientos`
      if (importRunId) {
        url += `?importRunId=${encodeURIComponent(importRunId)}`
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error("Error al cargar movimientos")

      const data = await response.json()
      setMovimientos(data.movimientos || [])
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
      setMovimientos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMovimientos()
  }, [])

  useEffect(() => {
    if (importRunId !== "") {
      fetchMovimientos()
    }
  }, [importRunId])

  useEffect(() => {
    let filtered = [...movimientos]

    if (filters.estadoRevision && filters.estadoRevision !== "todos") {
      filtered = filtered.filter((m) => m.estado_revision === filters.estadoRevision)
    }

    if (filters.estadoImportacion && filters.estadoImportacion !== "todos") {
      filtered = filtered.filter((m) => m.estado_importacion === filters.estadoImportacion)
    }

    if (filters.tipoTransaccion && filters.tipoTransaccion !== "todos") {
      filtered = filtered.filter((m) => m.tipo_transaccion === filters.tipoTransaccion)
    }

    if (filters.montoMin) {
      const min = Number.parseFloat(filters.montoMin)
      filtered = filtered.filter((m) => Number(m.monto) >= min)
    }

    if (filters.montoMax) {
      const max = Number.parseFloat(filters.montoMax)
      filtered = filtered.filter((m) => Number(m.monto) <= max)
    }

    if (filters.fechaDesde) {
      const desde = new Date(filters.fechaDesde)
      filtered = filtered.filter((m) => m.fecha_operacion && new Date(m.fecha_operacion) >= desde)
    }

    if (filters.fechaHasta) {
      const hasta = new Date(filters.fechaHasta)
      filtered = filtered.filter((m) => m.fecha_operacion && new Date(m.fecha_operacion) <= hasta)
    }

    if (filters.searchText) {
      const search = filters.searchText.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.lemonway_transaction_id.toLowerCase().includes(search) ||
          m.descripcion?.toLowerCase().includes(search) ||
          m.sender?.toLowerCase().includes(search) ||
          m.receiver?.toLowerCase().includes(search),
      )
    }

    setFilteredMovimientos(filtered)
  }, [movimientos, filters])

  const handleProcessMovements = async () => {
    setProcessing(true)
    try {
      const res = await fetch("/api/admin/lemonway/process-movements", {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()

      await fetchMovimientos()

      toast({
        title: "Procesamiento completado",
        description: `Movimientos procesados: ${data.processed}, Errores: ${data.errors}`,
        variant: data.errors > 0 ? "destructive" : "default",
      })

      if (data.errors > 0) {
        setAlerts(data.details.filter((d: any) => d.status === "error"))
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al procesar movimientos",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleBulkReprocess = async () => {
    if (selectedIds.size === 0) {
      toast({ title: "Error", description: "No hay movimientos seleccionados", variant: "destructive" })
      return
    }

    setProcessing(true)
    try {
      const res = await fetch("/api/admin/lemonway/reprocess-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movementIds: Array.from(selectedIds) }),
      })

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      const data = await res.json()
      await fetchMovimientos()

      toast({
        title: "Reprocesamiento completado",
        description: `Movimientos procesados: ${data.processed}, Errores: ${data.errors}`,
        variant: data.errors > 0 ? "destructive" : "default",
      })

      if (data.errors > 0) {
        setAlerts(data.details.filter((d: any) => d.status === "error"))
      }

      setSelectedIds(new Set())
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al reprocesar movimientos",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleReprocessSingle = async (id: string) => {
    try {
      const res = await fetch("/api/admin/lemonway/reprocess-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movementIds: [id] }),
      })

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

      await fetchMovimientos()
      toast({
        title: "Éxito",
        description: "Movimiento reprocesado",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al reprocesar",
        variant: "destructive",
      })
    }
  }

  const getRevisionBadge = (estado: string | null) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      null: "outline",
      aprobado: "default",
      rechazado: "destructive",
    }
    return <Badge variant={variants[estado || "null"] || "outline"}>{estado || "Pendiente"}</Badge>
  }

  const formatDate = (dateValue: string | null | undefined) => {
    if (!dateValue) return "-"
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return "-"
      return format(date, "dd/MM/yyyy HH:mm", { locale: es })
    } catch {
      return "-"
    }
  }

  const formatDateWithSeconds = (dateValue: string | null | undefined) => {
    if (!dateValue) return "-"
    try {
      const date = new Date(dateValue)
      if (isNaN(date.getTime())) return "-"
      return format(date, "dd/MM/yyyy HH:mm:ss", { locale: es })
    } catch {
      return "-"
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMovimientos.length && filteredMovimientos.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMovimientos.map((m) => m.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const clearFilters = () => {
    setFilters({
      estadoRevision: "todos",
      estadoImportacion: "todos",
      tipoTransaccion: "todos",
      montoMin: "",
      montoMax: "",
      fechaDesde: "",
      fechaHasta: "",
      searchText: "",
    })
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      toast({ title: "Error", description: "No hay movimientos seleccionados", variant: "destructive" })
      return
    }

    try {
      for (const id of selectedIds) {
        await fetch(`/api/lemonway/movimientos/${id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
        })
      }

      toast({ title: "Éxito", description: `${selectedIds.size} movimientos aprobados` })
      setSelectedIds(new Set())
      fetchMovimientos()
    } catch (error) {
      toast({ title: "Error", description: "Error al aprobar movimientos en lote", variant: "destructive" })
    }
  }

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) {
      toast({ title: "Error", description: "No hay movimientos seleccionados", variant: "destructive" })
      return
    }

    const motivo = prompt("Motivo del rechazo:")
    if (!motivo) return

    try {
      for (const id of selectedIds) {
        await fetch(`/api/lemonway/movimientos/${id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reject", motivo }),
        })
      }

      toast({ title: "Éxito", description: `${selectedIds.size} movimientos rechazados` })
      setSelectedIds(new Set())
      fetchMovimientos()
    } catch (error) {
      toast({ title: "Error", description: "Error al rechazar movimientos en lote", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros y Acciones</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="searchText">Buscar</Label>
                  <Input
                    id="searchText"
                    placeholder="Transaction ID, descripción..."
                    value={filters.searchText}
                    onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="estadoRevision">Estado Revisión</Label>
                  <Select
                    value={filters.estadoRevision}
                    onValueChange={(v) => setFilters({ ...filters, estadoRevision: v })}
                  >
                    <SelectTrigger id="estadoRevision">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="aprobado">Aprobado</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="estadoImportacion">Estado Importación</Label>
                  <Select
                    value={filters.estadoImportacion}
                    onValueChange={(v) => setFilters({ ...filters, estadoImportacion: v })}
                  >
                    <SelectTrigger id="estadoImportacion">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="importado">Importado</SelectItem>
                      <SelectItem value="procesado">Procesado</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="duplicado">Duplicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tipoTransaccion">Tipo Transacción</Label>
                  <Select
                    value={filters.tipoTransaccion}
                    onValueChange={(v) => setFilters({ ...filters, tipoTransaccion: v })}
                  >
                    <SelectTrigger id="tipoTransaccion">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="transactionIn">TransactionIn</SelectItem>
                      <SelectItem value="transactionP2P">TransactionP2P</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="montoMin">Monto Mínimo</Label>
                  <Input
                    id="montoMin"
                    type="number"
                    placeholder="0.00"
                    value={filters.montoMin}
                    onChange={(e) => setFilters({ ...filters, montoMin: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="montoMax">Monto Máximo</Label>
                  <Input
                    id="montoMax"
                    type="number"
                    placeholder="1000.00"
                    value={filters.montoMax}
                    onChange={(e) => setFilters({ ...filters, montoMax: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="fechaDesde">Fecha Desde</Label>
                  <Input
                    id="fechaDesde"
                    type="date"
                    value={filters.fechaDesde}
                    onChange={(e) => setFilters({ ...filters, fechaDesde: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="fechaHasta">Fecha Hasta</Label>
                  <Input
                    id="fechaHasta"
                    type="date"
                    value={filters.fechaHasta}
                    onChange={(e) => setFilters({ ...filters, fechaHasta: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={fetchMovimientos} variant="outline" disabled={processing}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refrescar
            </Button>
            <Button onClick={handleProcessMovements} disabled={processing}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processing ? "Procesando..." : "Procesar Cola"}
            </Button>

            {selectedIds.size > 0 && (
              <>
                <div className="border-l mx-2" />
                <Badge variant="secondary" className="py-2">
                  {selectedIds.size} seleccionados
                </Badge>
                <Button onClick={handleBulkApprove} size="sm" variant="default">
                  Aprobar Seleccionados
                </Button>
                <Button onClick={handleBulkReject} size="sm" variant="destructive">
                  Rechazar Seleccionados
                </Button>
                {/* Botón de reprocesar en acciones en lote */}
                <Button variant="outline" onClick={handleBulkReprocess} disabled={processing}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reprocesar Seleccionados
                </Button>
                <Button onClick={() => setSelectedIds(new Set())} size="sm" variant="outline">
                  Limpiar Selección
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Errores en Procesamiento ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div key={idx} className="text-sm border-l-4 border-destructive pl-3 py-2">
                  <p className="font-mono text-xs text-muted-foreground">{alert.id}</p>
                  <p className="text-destructive mt-1">{alert.message}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Movimientos Temporales ({filteredMovimientos.length}
            {filteredMovimientos.length !== movimientos.length && ` de ${movimientos.length}`})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filteredMovimientos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay movimientos que coincidan con los filtros
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === filteredMovimientos.length && filteredMovimientos.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Cuenta Virtual</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Comisión</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado Rev.</TableHead>
                    <TableHead>Estado Imp.</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimientos.map((mov) => (
                    <TableRow key={mov.id} className={selectedIds.has(mov.id) ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox checked={selectedIds.has(mov.id)} onCheckedChange={() => toggleSelect(mov.id)} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {mov.lemonway_transaction_id.substring(0, 12)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {mov.urbix_account_id ? mov.urbix_account_id.substring(0, 8) + "..." : "-"}
                      </TableCell>
                      <TableCell className="text-sm">{mov.tipo_transaccion}</TableCell>
                      <TableCell className={mov.monto >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        €{Number(mov.monto).toFixed(2)}
                      </TableCell>
                      <TableCell>€{Number(mov.commission).toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{formatDate(mov.fecha_operacion)}</TableCell>
                      <TableCell>{getRevisionBadge(mov.estado_revision)}</TableCell>
                      <TableCell>
                        <Badge variant={mov.estado_importacion === "procesado" ? "default" : "outline"}>
                          {mov.estado_importacion}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMovimiento(mov)
                              setDetailDialogOpen(true)
                            }}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <TempMovimientosActions
                            movimientoId={mov.id}
                            onSuccess={() => fetchMovimientos()}
                            onEdit={() => {
                              setSelectedMovimiento(mov)
                              setEditDialogOpen(true)
                            }}
                          />
                          {/* Agregar botón Reprocesar en cada fila con estado error */}
                          {mov.estado_importacion === "error" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReprocessSingle(mov.id)}
                              disabled={processing}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Reprocesar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del Movimiento</DialogTitle>
            <DialogDescription>Información completa del movimiento temporal</DialogDescription>
          </DialogHeader>
          {selectedMovimiento && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Información Principal</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Transaction ID</dt>
                    <dd className="font-mono mt-1">{selectedMovimiento.lemonway_transaction_id}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Import Run ID</dt>
                    <dd className="font-mono text-xs mt-1">{selectedMovimiento.import_run_id}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Cuenta Virtual ID</dt>
                    <dd className="font-mono text-xs mt-1">{selectedMovimiento.urbix_account_id || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Lemonway Account ID</dt>
                    <dd className="font-mono mt-1">{selectedMovimiento.cuenta_virtual_id}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Datos Financieros</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Monto</dt>
                    <dd
                      className={`mt-1 font-medium ${selectedMovimiento.monto >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      €{Number(selectedMovimiento.monto).toFixed(2)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Comisión</dt>
                    <dd className="mt-1 font-medium">€{Number(selectedMovimiento.commission).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tipo Transacción</dt>
                    <dd className="mt-1">{selectedMovimiento.tipo_transaccion}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Método Pago</dt>
                    <dd className="mt-1">{selectedMovimiento.payment_method || "-"}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Detalles de Transacción</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Sender</dt>
                    <dd className="mt-1">{selectedMovimiento.sender || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Receiver</dt>
                    <dd className="mt-1">{selectedMovimiento.receiver || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Fecha Operación</dt>
                    <dd className="mt-1">{formatDateWithSeconds(selectedMovimiento.fecha_operacion)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="mt-1">{selectedMovimiento.status || "-"}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Descripción</dt>
                    <dd className="mt-1">{selectedMovimiento.descripcion || "-"}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Estado de Revisión</h3>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Estado</dt>
                    <dd className="mt-1">{getRevisionBadge(selectedMovimiento.estado_revision)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Revisado Por</dt>
                    <dd className="mt-1">{selectedMovimiento.revisado_por || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Fecha Revisión</dt>
                    <dd className="mt-1">{formatDateWithSeconds(selectedMovimiento.revisado_at)}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Datos Raw (JSON)</h3>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-64 border">
                  {JSON.stringify(selectedMovimiento.lemonway_raw_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedMovimiento && (
        <TempMovimientosEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          movimiento={selectedMovimiento}
          onSuccess={() => {
            fetchMovimientos()
            setEditDialogOpen(false)
          }}
        />
      )}
    </div>
  )
}
