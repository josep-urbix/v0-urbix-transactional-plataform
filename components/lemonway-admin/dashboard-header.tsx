"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface QueueStats {
  priority: string
  status: string
  count: number
}

export function DashboardHeader() {
  const [stats, setStats] = useState<QueueStats[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/lemonway/queue/stats")
        const data = await res.json()
        if (data.success) {
          setStats(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh cada 30s
    return () => clearInterval(interval)
  }, [])

  const urgentPending = stats.find((s) => s.priority === "URGENT" && s.status === "pending")?.count || 0
  const normalPending = stats.find((s) => s.priority === "NORMAL" && s.status === "pending")?.count || 0
  const processing = stats.find((s) => s.status === "processing")?.count || 0

  return (
    <div className="border-b bg-background">
      <div className="container mx-auto py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lemonway Admin Dashboard</h1>
            <p className="text-muted-foreground">Gestión centralizada de integración con Lemonway</p>
          </div>

          <div className="flex gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Urgentes</p>
                  <p className="text-2xl font-bold text-red-600">{urgentPending}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Normales</p>
                  <p className="text-2xl font-bold text-blue-600">{normalPending}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">En proceso</p>
                  <p className="text-2xl font-bold text-amber-600">{processing}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
