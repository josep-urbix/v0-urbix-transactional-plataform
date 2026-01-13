"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Wallet,
  CreditCard,
  Contact,
  Mail,
  Database,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Eye,
  MousePointer,
} from "lucide-react"
import Link from "next/link"

interface DashboardStats {
  wallets: {
    total: number
    active: number
    blocked: number
    totalBalance: number
  }
  lemonway: {
    apiCalls: {
      total: number
      successful: number
      failed: number
      pendingRetries: number
      avgDurationMs: number
    }
    transactions: {
      total: number
      completed: number
      pending: number
      failed: number
      totalAmount: number
    }
  }
  hubspot: {
    total: number
    incoming: number
    outgoing: number
    errors: number
  }
  gmail: {
    sent: number
    delivered: number
    opened: number
    failed: number
    totalOpens: number
    totalClicks: number
    templates: {
      total: number
      active: number
    }
  }
  sql: {
    totalQueries: number
    successful: number
    failed: number
    avgExecutionMs: number
  }
  cron: {
    totalJobs: number
    activeJobs: number
    totalRuns: number
    successfulRuns: number
    failedRuns: number
    recentExecutions: {
      total: number
      successful: number
      failed: number
      avgDurationMs: number
    }
  }
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

function StatCard({
  title,
  icon: Icon,
  children,
  href,
  iconColor = "text-muted-foreground",
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  href?: string
  iconColor?: string
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow h-[280px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">{children}</CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

function StatRow({
  label,
  value,
  badge,
  badgeVariant = "secondary",
}: {
  label: string
  value: string | number
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline"
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{value}</span>
        {badge && <Badge variant={badgeVariant}>{badge}</Badge>}
      </div>
    </div>
  )
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

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/dashboard/stats")
      if (!response.ok) {
        throw new Error("Error al cargar estadísticas")
      }
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
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
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

  if (!stats) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Resumen del estado de todos los sistemas (últimas 24h)</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            Actualizado: {new Date(stats.timestamp).toLocaleString("es-ES")}
          </span>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* WALLETS */}
        <StatCard title="WALLETS" icon={Wallet} href="/dashboard/payment-accounts" iconColor="text-blue-500">
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatNumber(stats.wallets.total)}</div>
                <p className="text-xs text-muted-foreground">Cuentas totales</p>
              </div>
              <SuccessRate successful={stats.wallets.active} failed={stats.wallets.blocked} />
            </div>
            <div className="border-t pt-2 mt-2 flex-1">
              <StatRow label="Activas" value={formatNumber(stats.wallets.active)} badge="OK" badgeVariant="default" />
              <StatRow
                label="Bloqueadas"
                value={formatNumber(stats.wallets.blocked)}
                badge={stats.wallets.blocked > 0 ? "!" : undefined}
                badgeVariant="destructive"
              />
              <StatRow label="Balance Total" value={formatCurrency(stats.wallets.totalBalance)} />
              <div className="py-1 h-[28px]" />
            </div>
          </div>
        </StatCard>

        {/* LEMONWAY */}
        <StatCard title="LEMONWAY" icon={CreditCard} href="/dashboard/lemonway-transactions" iconColor="text-green-500">
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatNumber(stats.lemonway.apiCalls.total)}</div>
                <p className="text-xs text-muted-foreground">Llamadas API (24h)</p>
              </div>
              <SuccessRate successful={stats.lemonway.apiCalls.successful} failed={stats.lemonway.apiCalls.failed} />
            </div>
            <div className="border-t pt-2 mt-2 flex-1">
              <StatRow label="Exitosas" value={formatNumber(stats.lemonway.apiCalls.successful)} />
              <StatRow
                label="Fallidas"
                value={formatNumber(stats.lemonway.apiCalls.failed)}
                badge={stats.lemonway.apiCalls.failed > 0 ? "!" : undefined}
                badgeVariant="destructive"
              />
              <StatRow label="Reintentos" value={formatNumber(stats.lemonway.apiCalls.pendingRetries)} />
              <StatRow label="Tiempo medio" value={`${stats.lemonway.apiCalls.avgDurationMs || 0} ms`} />
            </div>
          </div>
        </StatCard>

        {/* HUBSPOT */}
        <StatCard title="HUBSPOT" icon={Contact} href="/dashboard/transactions" iconColor="text-orange-500">
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatNumber(stats.hubspot.total)}</div>
                <p className="text-xs text-muted-foreground">Transacciones (24h)</p>
              </div>
              <SuccessRate successful={stats.hubspot.total - stats.hubspot.errors} failed={stats.hubspot.errors} />
            </div>
            <div className="border-t pt-2 mt-2 flex-1">
              <StatRow label="Entrantes" value={formatNumber(stats.hubspot.incoming)} badge="IN" />
              <StatRow
                label="Salientes"
                value={formatNumber(stats.hubspot.outgoing)}
                badge="OUT"
                badgeVariant="outline"
              />
              <StatRow
                label="Errores"
                value={formatNumber(stats.hubspot.errors)}
                badge={stats.hubspot.errors > 0 ? "!" : undefined}
                badgeVariant="destructive"
              />
              <div className="py-1 h-[28px]" />
            </div>
          </div>
        </StatCard>

        {/* GMAIL */}
        <StatCard title="GMAIL" icon={Mail} href="/dashboard/email-sends" iconColor="text-red-500">
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatNumber(stats.gmail.sent)}</div>
                <p className="text-xs text-muted-foreground">Emails enviados (24h)</p>
              </div>
              <SuccessRate successful={stats.gmail.delivered} failed={stats.gmail.failed} />
            </div>
            <div className="border-t pt-2 mt-2 flex-1">
              <StatRow label="Entregados" value={formatNumber(stats.gmail.delivered)} />
              <StatRow label="Abiertos" value={formatNumber(stats.gmail.opened)} />
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Tracking</span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{formatNumber(stats.gmail.totalOpens)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MousePointer className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{formatNumber(stats.gmail.totalClicks)}</span>
                  </div>
                </div>
              </div>
              <StatRow label="Plantillas" value={`${stats.gmail.templates.active}/${stats.gmail.templates.total}`} />
            </div>
          </div>
        </StatCard>

        {/* SQL */}
        <StatCard title="SQL" icon={Database} href="/dashboard/sql-logs" iconColor="text-purple-500">
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatNumber(stats.sql.totalQueries)}</div>
                <p className="text-xs text-muted-foreground">Consultas (24h)</p>
              </div>
              <SuccessRate successful={stats.sql.successful} failed={stats.sql.failed} />
            </div>
            <div className="border-t pt-2 mt-2 flex-1">
              <StatRow label="Exitosas" value={formatNumber(stats.sql.successful)} />
              <StatRow
                label="Fallidas"
                value={formatNumber(stats.sql.failed)}
                badge={stats.sql.failed > 0 ? "!" : undefined}
                badgeVariant="destructive"
              />
              <StatRow label="Tiempo medio" value={`${stats.sql.avgExecutionMs || 0} ms`} />
              <div className="py-1 h-[28px]" />
            </div>
          </div>
        </StatCard>

        {/* CRON */}
        <StatCard title="CRON" icon={Clock} href="/dashboard/cron-jobs" iconColor="text-cyan-500">
          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">
                  {stats.cron.activeJobs}/{stats.cron.totalJobs}
                </div>
                <p className="text-xs text-muted-foreground">Tareas activas</p>
              </div>
              <SuccessRate
                successful={stats.cron.recentExecutions.successful}
                failed={stats.cron.recentExecutions.failed}
              />
            </div>
            <div className="border-t pt-2 mt-2 flex-1">
              <StatRow label="Ejecuciones (24h)" value={formatNumber(stats.cron.recentExecutions.total)} />
              <StatRow label="Exitosas" value={formatNumber(stats.cron.recentExecutions.successful)} />
              <StatRow
                label="Fallidas"
                value={formatNumber(stats.cron.recentExecutions.failed)}
                badge={stats.cron.recentExecutions.failed > 0 ? "!" : undefined}
                badgeVariant="destructive"
              />
              <StatRow label="Tiempo medio" value={`${stats.cron.recentExecutions.avgDurationMs || 0} ms`} />
            </div>
          </div>
        </StatCard>
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
            <Link href="/dashboard/payment-accounts">
              <Button variant="outline" size="sm">
                <Wallet className="mr-2 h-4 w-4" />
                Ver Wallets
              </Button>
            </Link>
            <Link href="/dashboard/lemonway-transactions">
              <Button variant="outline" size="sm">
                <CreditCard className="mr-2 h-4 w-4" />
                Transacciones Lemonway
              </Button>
            </Link>
            <Link href="/dashboard/transactions">
              <Button variant="outline" size="sm">
                <Contact className="mr-2 h-4 w-4" />
                Transactions HubSpot
              </Button>
            </Link>
            <Link href="/dashboard/email-templates">
              <Button variant="outline" size="sm">
                <Mail className="mr-2 h-4 w-4" />
                Plantillas Email
              </Button>
            </Link>
            <Link href="/dashboard/sql-logs">
              <Button variant="outline" size="sm">
                <Database className="mr-2 h-4 w-4" />
                SQL Logs
              </Button>
            </Link>
            <Link href="/dashboard/cron-jobs">
              <Button variant="outline" size="sm">
                <Clock className="mr-2 h-4 w-4" />
                Tareas Cron
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
