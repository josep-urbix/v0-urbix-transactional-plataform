"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Search, PlayCircle, AlertCircle, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ImportRun {
  id: string
  account_id: string
  cuenta_virtual_id: string | null
  start_date: string
  end_date: string
  status: string
  total_transactions: number
  imported_transactions: number
  failed_transactions: number
  error_message: string | null
  created_at: string
  updated_at: string
}

interface Pagination {
  limit: number
  offset: number
  total: number
}

interface SavedFilters {
  statusFilter: string
  accountIdFrom: string
  accountIdTo: string
  startDate: string
  endDate: string
}

interface SavedImportForm {
  accountIdFrom: string
  accountIdTo: string
  startDate: string
  endDate: string
}

export function LemonwayImportsList() {
  const router = useRouter()
  const { toast } = useToast()
  const [imports, setImports] = useState<ImportRun[]>([])
  const [loading, setLoading] = useState(true)
  const [startingImport, setStartingImport] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [accountIdFrom, setAccountIdFrom] = useState("")
  const [accountIdTo, setAccountIdTo] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [pagination, setPagination] = useState<Pagination>({ limit: 50, offset: 0, total: 0 })

  useEffect(() => {
    // Cargar filtros de búsqueda
    const savedFilters = localStorage.getItem("lemonway-imports-filters")
    if (savedFilters) {
      try {
        const filters: SavedFilters = JSON.parse(savedFilters)
        setStatusFilter(filters.statusFilter || "all")
        setAccountIdFrom(filters.accountIdFrom || "")
        setAccountIdTo(filters.accountIdTo || "")
        setStartDate(filters.startDate || "")
        setEndDate(filters.endDate || "")
      } catch (error) {
        console.error("Error loading filters:", error)
      }
    }

    // Cargar formulario de importación (sobrescribe valores del filtro si existen)
    const savedImportForm = localStorage.getItem("lemonway-import-form")
    if (savedImportForm) {
      try {
        const formData: SavedImportForm = JSON.parse(savedImportForm)
        setAccountIdFrom(formData.accountIdFrom || "")
        setAccountIdTo(formData.accountIdTo || "")
        setStartDate(formData.startDate || "")
        setEndDate(formData.endDate || "")
      } catch (error) {
        console.error("Error loading import form:", error)
      }
    }
  }, [])

  useEffect(() => {
    const filters: SavedFilters = {
      statusFilter,
      accountIdFrom,
      accountIdTo,
      startDate,
      endDate,
    }
    localStorage.setItem("lemonway-imports-filters", JSON.stringify(filters))
  }, [statusFilter, accountIdFrom, accountIdTo, startDate, endDate])

  useEffect(() => {
    const importFormData: SavedImportForm = {
      accountIdFrom,
      accountIdTo,
      startDate,
      endDate,
    }
    localStorage.setItem("lemonway-import-form", JSON.stringify(importFormData))
  }, [accountIdFrom, accountIdTo, startDate, endDate])

  const fetchImports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      params.append("limit", pagination.limit.toString())
      params.append("offset", pagination.offset.toString())

      const response = await fetch(`/api/lemonway/imports?${params.toString()}`)
      if (!response.ok) throw new Error("Error al cargar importaciones")

      const data = await response.json()
      const validImports = (data.imports || []).filter((imp: ImportRun) => {
        if (!imp.id) {
          console.warn("[v0] Import sin ID encontrado:", imp)
        }
        return !!imp.id
      })
      setImports(validImports)
      setPagination(data.pagination)
    } catch (error) {
      console.error("[v0] Error fetching imports:", error)
      toast({
        title: "Error",
        description: "Error al cargar el historial de importaciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchImports()
  }, [statusFilter])

  const handleStartImport = async () => {
    if (!accountIdFrom || !accountIdTo || !startDate || !endDate) {
      toast({
        title: "Campos requeridos",
        description: "Debes completar todos los campos (cuenta inicial, cuenta final y fechas)",
        variant: "destructive",
      })
      return
    }

    const from = Number.parseInt(accountIdFrom, 10)
    const to = Number.parseInt(accountIdTo, 10)

    if (isNaN(from) || isNaN(to)) {
      toast({
        title: "Error de formato",
        description: "Las cuentas deben ser números válidos",
        variant: "destructive",
      })
      return
    }

    if (from > to) {
      toast({
        title: "Rango inválido",
        description: "La cuenta inicial debe ser menor o igual a la cuenta final",
        variant: "destructive",
      })
      return
    }

    const totalAccounts = to - from + 1
    if (totalAccounts > 1000) {
      toast({
        title: "Rango muy grande",
        description: "El rango máximo permitido es de 1000 cuentas",
        variant: "destructive",
      })
      return
    }

    try {
      setStartingImport(true)
      const response = await fetch("/api/lemonway/imports/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountIdFrom: from,
          accountIdTo: to,
          startDate,
          endDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al iniciar importación")
      }

      const data = await response.json()
      toast({
        title: "Importación iniciada",
        description: `Se han creado ${data.totalRuns} tareas de importación para ${totalAccounts} cuentas`,
      })

      await fetchImports()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setStartingImport(false)
    }
  }

  const handleManualProcess = async () => {
    try {
      setProcessing(true)
      const response = await fetch("/api/lemonway/imports/process", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al procesar importaciones")
      }

      const data = await response.json()
      toast({
        title: "Procesamiento completado",
        description: data.message || `Procesadas: ${data.processed} | Fallidas: ${data.failed}`,
      })

      await fetchImports()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const clearFilters = () => {
    setStatusFilter("all")
    setAccountIdFrom("")
    setAccountIdTo("")
    setStartDate("")
    setEndDate("")
    localStorage.removeItem("lemonway-imports-filters")
    localStorage.removeItem("lemonway-import-form")
    toast({
      title: "Filtros y formulario borrados",
      description: "Se han eliminado todos los filtros guardados y el formulario de importación",
    })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      completed: "outline",
      failed: "destructive",
    }
    return <Badge variant={variants[status] || "default"}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Start Import Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Iniciar Nueva Importación</CardTitle>
              <CardDescription>Importa transacciones desde Lemonway para un rango de cuentas y fechas</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAccountIdFrom("")
                setAccountIdTo("")
                setStartDate("")
                setEndDate("")
                localStorage.removeItem("lemonway-import-form")
                toast({
                  title: "Formulario borrado",
                  description: "Se han eliminado los valores guardados del formulario de importación",
                })
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar Formulario
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alert about async processing */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Las importaciones se procesan de forma asíncrona. Puedes importar múltiples cuentas a la vez especificando
              un rango.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountIdFrom">Cuenta Inicial</Label>
              <Input
                id="accountIdFrom"
                type="number"
                placeholder="Ej: 1001"
                value={accountIdFrom}
                onChange={(e) => setAccountIdFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountIdTo">Cuenta Final</Label>
              <Input
                id="accountIdTo"
                type="number"
                placeholder="Ej: 1050"
                value={accountIdTo}
                onChange={(e) => setAccountIdTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleStartImport} disabled={startingImport} className="w-full">
                {startingImport ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Iniciar Importación
                  </>
                )}
              </Button>
            </div>
          </div>

          {accountIdFrom &&
            accountIdTo &&
            !isNaN(Number.parseInt(accountIdFrom)) &&
            !isNaN(Number.parseInt(accountIdTo)) && (
              <div className="text-sm text-muted-foreground">
                {Number.parseInt(accountIdTo) >= Number.parseInt(accountIdFrom) ? (
                  <span>
                    Se importarán <strong>{Number.parseInt(accountIdTo) - Number.parseInt(accountIdFrom) + 1}</strong>{" "}
                    cuentas
                  </span>
                ) : (
                  <span className="text-destructive">La cuenta final debe ser mayor o igual a la inicial</span>
                )}
              </div>
            )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Busca y filtra importaciones</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Limpiar Filtros
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="failed">Fallido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleManualProcess} disabled={processing} className="w-full">
                {processing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Procesar Pendientes
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchImports} variant="outline" className="w-full bg-transparent">
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Imports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Importaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : imports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay importaciones registradas</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Account ID</TableHead>
                  <TableHead>Rango de Fechas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Transacciones</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">{imp.id.substring(0, 8)}...</TableCell>
                    <TableCell>{imp.account_id}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(imp.start_date), "dd/MM/yyyy", { locale: es })} -{" "}
                      {format(new Date(imp.end_date), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>{getStatusBadge(imp.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>Total: {imp.total_transactions}</div>
                        <div className="text-green-600">Importadas: {imp.imported_transactions}</div>
                        {imp.failed_transactions > 0 && (
                          <div className="text-red-600">Fallidas: {imp.failed_transactions}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(imp.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/lemonway/imports/${imp.id}`)}
                      >
                        Ver Detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
