"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, RefreshCw, AlertCircle, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ImportRun {
  id: string
  account_id: string
  cuenta_virtual_id: string | null
  urbix_account_id: string | null
  start_date: string
  end_date: string
  status: string
  total_transactions: number
  imported_transactions: number
  failed_transactions: number
  error_message: string | null
  created_at: string
  updated_at: string
  api_call_log_id: string | null
}

interface LemonwayImportDetailProps {
  runId: string
}

interface MovimientoCuenta {
  id: string
  lemonway_transaction_id: string
  monto: number | string
  commission: number | string
  tipo_transaccion: string
  status: number
  descripcion: string
  sender: string | null
  receiver: string | null
  fecha_operacion: string
  estado_importacion: string
}

const toNumber = (value: any): number => {
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

export function LemonwayImportDetail({ runId }: LemonwayImportDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [importRun, setImportRun] = useState<ImportRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState(false)
  const [processingQueue, setProcessingQueue] = useState(false)
  const [transactions, setTransactions] = useState<MovimientoCuenta[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  const fetchImportDetail = useCallback(async () => {
    if (!runId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/lemonway/imports/${runId}`)
      if (!response.ok) throw new Error("Error al cargar detalle")

      const data = await response.json()
      setImportRun(data.import)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [runId, toast])

  const fetchTransactions = useCallback(async () => {
    if (!runId) return

    try {
      setLoadingTransactions(true)
      const response = await fetch(`/api/lemonway/movimientos?importRunId=${runId}`)
      if (!response.ok) throw new Error("Error al cargar transacciones")

      const data = await response.json()
      setTransactions(data.movimientos || [])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    } finally {
      setLoadingTransactions(false)
    }
  }, [runId])

  useEffect(() => {
    if (!runId) return

    fetchImportDetail()
    fetchTransactions()
  }, [runId])

  useEffect(() => {
    if (!runId || !importRun) return

    if (importRun.status !== "pending" && importRun.status !== "processing") {
      return
    }

    const interval = setInterval(() => {
      fetchImportDetail()
      fetchTransactions()
    }, 5000)

    return () => clearInterval(interval)
  }, [runId, importRun, fetchImportDetail, fetchTransactions])

  const handleRetry = async () => {
    try {
      setRetrying(true)
      const response = await fetch(`/api/lemonway/imports/${runId}/retry`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Error al reintentar")

      toast({
        title: "Reintento iniciado",
        description: "La importación se está reprocesando",
      })

      await fetchImportDetail()
      await fetchTransactions()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setRetrying(false)
    }
  }

  const handleProcessQueue = async () => {
    try {
      setProcessingQueue(true)
      const response = await fetch("/api/lemonway/retry-queue", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Error al procesar cola")

      const data = await response.json()

      toast({
        title: "Cola procesada",
        description: `Procesadas ${data.processed || 0} transacciones. ${data.successful || 0} exitosas.`,
      })

      setTimeout(() => {
        fetchImportDetail()
        fetchTransactions()
      }, 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setProcessingQueue(false)
    }
  }

  if (!runId) {
    return <div className="text-center py-8">ID de importación no válido</div>
  }

  if (loading) {
    return <div className="text-center py-8">Cargando...</div>
  }

  if (!importRun) {
    return <div className="text-center py-8">Importación no encontrada</div>
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

  const progress =
    importRun.total_transactions > 0
      ? Math.round((importRun.imported_transactions / importRun.total_transactions) * 100)
      : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalle de Importación</h1>
            <p className="text-muted-foreground mt-1">ID: {importRun.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchImportDetail}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refrescar
          </Button>
          <Button variant="outline" onClick={handleProcessQueue} disabled={processingQueue}>
            <RefreshCw className={`mr-2 h-4 w-4 ${processingQueue ? "animate-spin" : ""}`} />
            Procesar Cola
          </Button>
          {importRun.status === "failed" && (
            <Button onClick={handleRetry} disabled={retrying}>
              <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
              Reintentar
            </Button>
          )}
        </div>
      </div>

      {importRun.error_message && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{importRun.error_message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Estado</CardDescription>
          </CardHeader>
          <CardContent>{getStatusBadge(importRun.status)}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{importRun.total_transactions ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Importadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{importRun.imported_transactions ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Fallidas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{importRun.failed_transactions ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progreso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso total</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Importación</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Account ID</dt>
              <dd className="mt-1">{importRun.account_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Cuenta Virtual ID</dt>
              <dd className="mt-1 font-mono text-sm">
                {importRun.urbix_account_id ? `${importRun.urbix_account_id.slice(0, 8)}...` : "No vinculada"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Fecha Inicio</dt>
              <dd className="mt-1">{format(new Date(importRun.start_date), "dd/MM/yyyy", { locale: es })}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Fecha Fin</dt>
              <dd className="mt-1">{format(new Date(importRun.end_date), "dd/MM/yyyy", { locale: es })}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Creada</dt>
              <dd className="mt-1">{format(new Date(importRun.created_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Actualizada</dt>
              <dd className="mt-1">{format(new Date(importRun.updated_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {importRun.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Movimientos Importados</CardTitle>
            <CardDescription>Ver los movimientos temporales creados por esta importación</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/dashboard/lemonway/temp-movimientos?importRunId=${importRun.id}`)}>
              <Download className="mr-2 h-4 w-4" />
              Ver Movimientos
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transacciones de Lemonway</CardTitle>
              <CardDescription>{transactions.length} transacciones importadas desde Lemonway</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTransactions} disabled={loadingTransactions}>
              <RefreshCw className={`h-4 w-4 ${loadingTransactions ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTransactions ? (
            <div className="text-center py-8 text-muted-foreground">Cargando transacciones...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay transacciones para este import run</div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Lemonway</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Comisión</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Import Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">{tx.lemonway_transaction_id}</TableCell>
                      <TableCell>
                        <Badge variant={tx.tipo_transaccion === "transactionP2P" ? "default" : "secondary"}>
                          {tx.tipo_transaccion === "transactionP2P" ? "P2P" : "IN"}
                        </Badge>
                      </TableCell>
                      <TableCell className={toNumber(tx.monto) < 0 ? "text-red-600" : "text-green-600"}>
                        €{toNumber(tx.monto).toFixed(2)}
                      </TableCell>
                      <TableCell>€{toNumber(tx.commission).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={tx.status === 3 ? "outline" : "secondary"}>
                          {tx.status === 3 ? "Completado" : `Status ${tx.status}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(tx.fecha_operacion), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {tx.descripcion || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tx.estado_importacion === "importado" ? "outline" : "secondary"}>
                          {tx.estado_importacion}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
