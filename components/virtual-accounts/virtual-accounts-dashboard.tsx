"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Wallet,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Plus,
  Settings,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  accounts: {
    total: number
    active: number
    inactive: number
    total_balance: number
  }
  movements24h: {
    total: number
    credits: number
    debits: number
    total_credits_amount: number
    total_debits_amount: number
    synced: number
    sync_failed: number
  }
  movements30d: {
    total: number
    total_credits: number
    total_debits: number
  }
  operationTypes: {
    total_types: number
    used_types: number
    credit_types: number
    debit_types: number
  }
  topOperations: Array<{
    codigo: string
    descripcion: string
    tipo: string
    count: number
    total_amount: number
  }>
  topAccounts: Array<{
    id: string
    numero_cuenta: string
    nombre_cuenta: string
    saldo_actual: number
    movement_count: number
    total_credits: number
    total_debits: number
  }>
  recentMovements: Array<{
    id: string
    fecha_movimiento: string
    tipo: string
    importe: number
    saldo_anterior: number
    saldo_nuevo: number
    referencia_lemonway: string | null
    estado_sincronizacion: string
    numero_cuenta: string
    nombre_cuenta: string
    operation_code: string
    operation_description: string
  }>
  alerts: {
    negative_balance: number
    inactive_with_balance: number
    stale_accounts: number
  }
  lemonwaySync: {
    successful: number
    failed: number
    pending: number
    last_sync: string | null
  }
  balanceTrend: Array<{
    date: string
    net_change: number
  }>
  timestamp: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("es-ES").format(num)
}

function SuccessRate({ successful, failed }: { successful: number; failed: number }) {
  const total = successful + failed
  const rate = total > 0 ? ((successful / total) * 100).toFixed(1) : "100"
  const isGood = Number.parseFloat(rate) >= 95
  const isWarning = Number.parseFloat(rate) >= 80 && Number.parseFloat(rate) < 95

  return (
    <div className="flex items-center gap-2">
      {isGood && <CheckCircle className="h-4 w-4 text-green-500" />}
      {isWarning && <AlertCircle className="h-4 w-4 text-yellow-500" />}
      {!isGood && !isWarning && <XCircle className="h-4 w-4 text-red-500" />}
      <span
        className={`text-sm font-medium ${isGood ? "text-green-600" : isWarning ? "text-yellow-600" : "text-red-600"}`}
      >
        {rate}%
      </span>
    </div>
  )
}

export function VirtualAccountsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/virtual-accounts/stats")
      if (!response.ok) throw new Error("Error al cargar estadísticas")
      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error || "No se pudieron cargar las estadísticas"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchStats} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    )
  }

  const totalAlerts = stats.alerts.negative_balance + stats.alerts.inactive_with_balance + stats.alerts.stale_accounts

  const pieData = [
    { name: "Crédito", value: stats.movements24h?.credits || 0, color: "#10b981" },
    { name: "Débito", value: stats.movements24h?.debits || 0, color: "#ef4444" },
  ].filter((item) => item.value > 0) // Solo mostrar items con valor > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#164AA6]">Dashboard - Cuentas Virtuales</h1>
          <p className="text-[#777777] mt-1">Resumen general y métricas clave</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#777777]">
            Actualizado: {new Date(stats.timestamp).toLocaleTimeString("es-ES")}
          </span>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Accounts */}
        <Card className="border-l-4 border-l-[#164AA6]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cuentas</CardTitle>
            <Wallet className="h-5 w-5 text-[#164AA6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#164AA6]">{formatNumber(stats.accounts.total)}</div>
            <div className="flex items-center gap-4 mt-2 text-xs text-[#777777]">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                {stats.accounts.active} activas
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-gray-400" />
                {stats.accounts.inactive} inactivas
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold text-[#164AA6]">
              Balance: {formatCurrency(Number.parseFloat(stats.accounts.total_balance.toString()))}
            </div>
          </CardContent>
        </Card>

        {/* Movements 24h */}
        <Card className="border-l-4 border-l-[#0FB7EA]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimientos (24h)</CardTitle>
            <Activity className="h-5 w-5 text-[#0FB7EA]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#164AA6]">{formatNumber(stats.movements24h.total)}</div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <ArrowUpRight className="h-3 w-3" />
                {stats.movements24h.credits} créditos
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <ArrowDownRight className="h-3 w-3" />
                {stats.movements24h.debits} débitos
              </span>
            </div>
            <div className="mt-2 text-sm text-[#777777]">
              Volumen:{" "}
              {formatCurrency(
                Number.parseFloat(
                  (stats.movements24h.total_credits_amount - stats.movements24h.total_debits_amount).toString(),
                ),
              )}
            </div>
          </CardContent>
        </Card>

        {/* Operation Types */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Operación</CardTitle>
            <Settings className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#164AA6]">{formatNumber(stats.operationTypes.total_types)}</div>
            <div className="mt-2 text-xs text-[#777777]">{stats.operationTypes.used_types} usados en 24h</div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-green-600">{stats.operationTypes.credit_types} crédito</span>
              <span className="text-red-600">{stats.operationTypes.debit_types} débito</span>
            </div>
          </CardContent>
        </Card>

        {/* Lemonway Sync */}
        <Card className={`border-l-4 ${stats.lemonwaySync.failed > 0 ? "border-l-red-500" : "border-l-green-500"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sincronización Lemonway</CardTitle>
            <SuccessRate successful={stats.lemonwaySync.successful} failed={stats.lemonwaySync.failed} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#164AA6]">
              {formatNumber(stats.lemonwaySync.successful + stats.lemonwaySync.failed)}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="text-green-600">{stats.lemonwaySync.successful} éxito</span>
              <span className="text-red-600">{stats.lemonwaySync.failed} fallos</span>
              <span className="text-yellow-600">{stats.lemonwaySync.pending} pendientes</span>
            </div>
            {stats.lemonwaySync.last_sync && (
              <div className="mt-2 text-xs text-[#777777]">
                Último: {new Date(stats.lemonwaySync.last_sync).toLocaleString("es-ES")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row - REPLACED with simple statistics cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Balance Trend - SIMPLIFIED to text stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolución del Balance (30 días)</CardTitle>
            <CardDescription>Resumen de cambios de balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Total movimientos en 30 días</p>
                <p className="text-2xl font-bold text-[#164AA6]">{formatNumber(stats.movements30d.total)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-600">Créditos (30d)</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(Number.parseFloat(stats.movements30d.total_credits.toString()))}
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs text-gray-600">Débitos (30d)</p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(Number.parseFloat(stats.movements30d.total_debits.toString()))}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Operations - SIMPLIFIED to list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Tipos de Operación (24h)</CardTitle>
            <CardDescription>Los 5 tipos más utilizados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.topOperations.length > 0 ? (
                stats.topOperations.map((op, index) => (
                  <div
                    key={`${op.codigo}-${index}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm font-semibold">
                          {op.codigo}
                        </Badge>
                        <span className="text-xs text-[#777777]">{op.descripcion || "Sin descripción"}</span>
                      </div>
                      <div className="text-xs text-[#777777] mt-1">
                        Tipo: {op.tipo === "CREDITO" ? "Crédito" : "Débito"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#164AA6]">{op.count} ops</div>
                      <div className="text-xs text-[#777777]">
                        {formatCurrency(Number.parseFloat(op.total_amount.toString()))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center p-4 text-[#777777]">No hay operaciones en 24h</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Pie & Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Crédito/Débito Stats - SIMPLIFICADO sin gráfico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución Crédito/Débito (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm text-gray-600">Créditos (24h)</p>
                    <p className="text-xl font-semibold text-green-600">{stats?.movements24h?.credits || 0}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="text-sm text-gray-600">Débitos (24h)</p>
                    <p className="text-xl font-semibold text-red-600">{stats?.movements24h?.debits || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className={totalAlerts > 0 ? "border-l-4 border-l-red-500" : ""}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className={`h-5 w-5 ${totalAlerts > 0 ? "text-red-500" : "text-green-500"}`} />
              Alertas y Anomalías
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium text-red-900">Cuentas con balance negativo</span>
                <Badge variant="destructive">{stats.alerts.negative_balance}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-yellow-900">Inactivas con balance &gt; 0</span>
                <Badge className="bg-yellow-500">{stats.alerts.inactive_with_balance}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm font-medium text-orange-900">Sin actividad 30+ días (balance &gt; 0)</span>
                <Badge className="bg-orange-500">{stats.alerts.stale_accounts}</Badge>
              </div>
              {totalAlerts === 0 && (
                <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-green-900">No hay alertas activas</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Movements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Últimos Movimientos</CardTitle>
            <CardDescription>Los 20 movimientos más recientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.recentMovements.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{mov.numero_cuenta || "N/A"}</span>
                      <Badge variant="outline" className="text-xs">
                        {mov.operation_code || "N/A"}
                      </Badge>
                    </div>
                    <div className="text-xs text-[#777777] mt-1">{mov.operation_description || "Sin descripción"}</div>
                    <div className="text-xs text-[#777777]">
                      {mov.fecha_movimiento
                        ? new Date(mov.fecha_movimiento).toLocaleString("es-ES")
                        : "Fecha desconocida"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${mov.tipo === "CREDITO" ? "text-green-600" : "text-red-600"}`}>
                      {mov.tipo === "CREDITO" ? "+" : "-"}
                      {formatCurrency(Number.parseFloat(mov.importe.toString()))}
                    </div>
                    <div className="text-xs text-[#777777]">
                      Saldo: {formatCurrency(Number.parseFloat(mov.saldo_nuevo.toString()))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cuentas con Mayor Actividad (24h)</CardTitle>
            <CardDescription>Top 10 por número de movimientos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {stats.topAccounts.map((account, index) => (
                <Link key={account.id} href={`/dashboard/virtual-accounts/${account.id}`}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#164AA6] text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{account.numero_cuenta}</div>
                        <div className="text-xs text-[#777777]">{account.nombre_cuenta}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#164AA6]">{account.movement_count} mov.</div>
                      <div className="text-xs text-[#777777]">
                        {formatCurrency(Number.parseFloat(account.saldo_actual.toString()))}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/virtual-accounts/create">
              <Button className="bg-[#164AA6] hover:bg-[#0FB7EA]">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Cuenta Virtual
              </Button>
            </Link>
            <Link href="/dashboard/virtual-accounts/accounts">
              <Button variant="outline">
                <Wallet className="mr-2 h-4 w-4" />
                Ver Todas las Cuentas
              </Button>
            </Link>
            <Link href="/dashboard/virtual-accounts/operation-types">
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Gestionar Tipos de Operación
              </Button>
            </Link>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar Reporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
