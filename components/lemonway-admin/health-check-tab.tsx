"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface HealthStatus {
  service: string
  status: "healthy" | "degraded" | "down"
  latency_ms: number
  last_check: string
}

export function HealthCheckTab() {
  const [health, setHealth] = useState<HealthStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/admin/lemonway/health")
        const data = await res.json()
        if (data.success) {
          setHealth(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching health:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 60000) // Check cada minuto
    return () => clearInterval(interval)
  }, [])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      healthy: "bg-green-600",
      degraded: "bg-yellow-600",
      down: "bg-red-600",
    }
    return <Badge className={variants[status] || "bg-gray-600"}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Estado de Servicios</CardTitle>
          <CardDescription>Monitoreo en tiempo real de la integración con Lemonway</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => window.location.reload()}>Actualizar Estado</Button>

          <div className="grid gap-4 mt-6">
            {health.map((h) => (
              <div key={h.service} className="p-4 border rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold">{h.service}</p>
                  <p className="text-sm text-muted-foreground">Latencia: {h.latency_ms}ms</p>
                  <p className="text-sm text-muted-foreground">
                    Último check: {new Date(h.last_check).toLocaleString()}
                  </p>
                </div>
                <div>{getStatusBadge(h.status)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
