"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Activity, TrendingUp, TrendingDown, Clock, CheckCircle2, Layers, AlertTriangle, Minus } from "lucide-react"

interface QueueStats {
  total_calls: number
  successful_calls: number
  failed_calls: number
  avg_duration_ms: number
  max_duration_ms: number
  min_duration_ms: number
  unique_endpoints: number
}

interface QueueStatus {
  queued: number
  active: number
}

interface RetryStats {
  manualRetryCount: number
  finalFailureCount: number
  pendingRetryCount: number
}

interface RecentCall {
  endpoint: string
  created_at: string
  duration_ms: number
  success: boolean
}

export default function LemonwayQueueStats() {
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([])
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({ queued: 0, active: 0 })
  const [retryStats, setRetryStats] = useState<RetryStats>({
    manualRetryCount: 0,
    finalFailureCount: 0,
    pendingRetryCount: 0,
  })
  const [systemStatus, setSystemStatus] = useState<"active" | "warning" | "error">("active")
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"1m" | "15m" | "1h" | "8h" | "24h">("1h")
  const [previousQueued, setPreviousQueued] = useState<number | null>(null)
  const [queueTrend, setQueueTrend] = useState<"up" | "down" | "stable">("stable")

  const isMountedRef = useRef(true)

  const fetchStats = useCallback(async () => {
    if (!isMountedRef.current) return

    try {
      const response = await fetch(`/api/lemonway/queue-stats?timeRange=${timeRange}`)

      // Handle non-JSON responses (rate limiting, server errors)
      if (!response.ok) {
        console.warn(`[QueueStats] Server returned ${response.status}`)
        setLoading(false)
        return
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("[QueueStats] Non-JSON response received")
        setLoading(false)
        return
      }

      const data = await response.json()

      if (!isMountedRef.current) return

      if (data.stats) {
        setStats(data.stats)
        setRecentCalls(data.recentCalls || [])
        setRetryStats(data.retryStats || { manualRetryCount: 0, finalFailureCount: 0, pendingRetryCount: 0 })
        setSystemStatus(data.systemStatus || "active")

        // Update queue status and trend
        if (data.queueStatus) {
          if (previousQueued !== null) {
            if (data.queueStatus.queued > previousQueued) {
              setQueueTrend("up")
            } else if (data.queueStatus.queued < previousQueued) {
              setQueueTrend("down")
            } else {
              setQueueTrend("stable")
            }
          }
          setPreviousQueued(data.queueStatus.queued)
          setQueueStatus(data.queueStatus)
        }
      }
    } catch (error) {
      // Silent fail - don't spam console
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [timeRange, previousQueued])

  useEffect(() => {
    isMountedRef.current = true

    fetchStats()

    const interval = setInterval(fetchStats, 15000)

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
    }
  }, [fetchStats])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Cargando estadísticas...</p>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return null
  }

  const successRate = stats.total_calls > 0 ? ((stats.successful_calls / stats.total_calls) * 100).toFixed(1) : "0.0"

  const timeRangeLabels = {
    "1m": "último minuto",
    "15m": "últimos 15 minutos",
    "1h": "última hora",
    "8h": "últimas 8 horas",
    "24h": "últimas 24 horas",
  }

  const getQueueStatusColor = (queued: number) => {
    if (queued <= 3)
      return {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-900",
        icon: "text-green-600",
        dot: "bg-green-600",
      }
    if (queued <= 10)
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-900",
        icon: "text-yellow-600",
        dot: "bg-yellow-600",
      }
    return { bg: "bg-red-50", border: "border-red-200", text: "text-red-900", icon: "text-red-600", dot: "bg-red-600" }
  }

  const getSystemStatusColor = () => {
    if (systemStatus === "error" || retryStats.finalFailureCount > 0) {
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-900",
        icon: "text-red-600",
      }
    }
    if (systemStatus === "warning" || retryStats.manualRetryCount > 0 || retryStats.pendingRetryCount > 0) {
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-900",
        icon: "text-yellow-600",
      }
    }
    return {
      bg: "bg-white",
      border: "border-border",
      text: "text-foreground",
      icon: "text-green-600",
    }
  }

  const queueColors = getQueueStatusColor(queueStatus.queued)
  const statusColors = getSystemStatusColor()

  const getTrendIcon = () => {
    if (queueTrend === "up") {
      return <TrendingUp className="h-4 w-4 text-red-600" />
    } else if (queueTrend === "down") {
      return <TrendingDown className="h-4 w-4 text-green-600" />
    } else {
      return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        <div className="flex gap-1">
          <Button variant={timeRange === "1m" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("1m")}>
            1 min
          </Button>
          <Button variant={timeRange === "15m" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("15m")}>
            15 min
          </Button>
          <Button variant={timeRange === "1h" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("1h")}>
            1 hora
          </Button>
          <Button variant={timeRange === "8h" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("8h")}>
            8 horas
          </Button>
          <Button variant={timeRange === "24h" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("24h")}>
            24 horas
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Llamadas ({timeRangeLabels[timeRange]})</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_calls}</div>
            <p className="text-xs text-muted-foreground">{stats.unique_endpoints} endpoints únicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Éxito</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.successful_calls} exitosas, {stats.failed_calls} fallidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(Number(stats.avg_duration_ms))}ms</div>
            <p className="text-xs text-muted-foreground">
              Min: {Math.round(Number(stats.min_duration_ms))}ms, Max: {Math.round(Number(stats.max_duration_ms))}ms
            </p>
          </CardContent>
        </Card>

        <Card className={`${queueColors.border} ${queueColors.bg}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cola de Peticiones</CardTitle>
            <Layers className={`h-4 w-4 ${queueColors.icon}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className={`text-2xl font-bold ${queueColors.text}`}>{queueStatus.queued}</div>
              {getTrendIcon()}
              <div className="text-sm text-muted-foreground">pendientes</div>
            </div>
            <p className="text-xs text-muted-foreground">
              {queueStatus.active} procesando
              {queueStatus.queued > 0 && (
                <span className={`ml-1 inline-block h-2 w-2 animate-pulse rounded-full ${queueColors.dot}`} />
              )}
            </p>
          </CardContent>
        </Card>

        <Card className={`${statusColors.border} ${statusColors.bg}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            {systemStatus === "error" ? (
              <AlertTriangle className={`h-4 w-4 ${statusColors.icon}`} />
            ) : systemStatus === "warning" ? (
              <AlertTriangle className={`h-4 w-4 ${statusColors.icon}`} />
            ) : recentCalls.length > 0 && recentCalls[0].success ? (
              <TrendingUp className={`h-4 w-4 ${statusColors.icon}`} />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${statusColors.text}`}>
              {systemStatus === "error" || retryStats.finalFailureCount > 0
                ? "Error"
                : systemStatus === "warning" || retryStats.manualRetryCount > 0 || retryStats.pendingRetryCount > 0
                  ? "Advertencia"
                  : recentCalls.length > 0
                    ? "Activo"
                    : "Inactivo"}
            </div>
            <p className="text-xs text-muted-foreground">
              {retryStats.finalFailureCount > 0 && `${retryStats.finalFailureCount} fallos finales`}
              {retryStats.finalFailureCount === 0 &&
                retryStats.manualRetryCount > 0 &&
                `${retryStats.manualRetryCount} reintentos manuales`}
              {retryStats.finalFailureCount === 0 &&
                retryStats.manualRetryCount === 0 &&
                retryStats.pendingRetryCount > 0 &&
                `${retryStats.pendingRetryCount} reintentos pendientes`}
              {retryStats.finalFailureCount === 0 &&
                retryStats.manualRetryCount === 0 &&
                retryStats.pendingRetryCount === 0 &&
                recentCalls.length > 0 &&
                `Última: ${new Date(recentCalls[0].created_at).toLocaleTimeString("es-ES")}`}
              {recentCalls.length === 0 &&
                retryStats.finalFailureCount === 0 &&
                retryStats.manualRetryCount === 0 &&
                retryStats.pendingRetryCount === 0 &&
                "Sin actividad reciente"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
