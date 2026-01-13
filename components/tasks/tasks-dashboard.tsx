"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, AlertCircle, Clock, Users, TrendingUp } from "lucide-react"
import { TasksList } from "./tasks-list"
import { CreateTaskDialog } from "./create-task-dialog"

interface TaskStats {
  total_pendientes: number
  total_criticas: number
  total_en_progreso: number
  total_vencidas: number
  tiempo_promedio_resolucion: number
  tareas_por_tipo: Array<{ tipo: string; count: number }>
}

export function TasksDashboardContent() {
  const [stats, setStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/tasks/stats")
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Cargando estadísticas...</div>
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_pendientes || 0}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas Críticas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.total_criticas || 0}</div>
            <p className="text-xs text-muted-foreground">Sin asignar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_en_progreso || 0}</div>
            <p className="text-xs text-muted-foreground">Siendo atendidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.tiempo_promedio_resolucion ? `${Math.round(stats.tiempo_promedio_resolucion)}h` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">Resolución</p>
          </CardContent>
        </Card>
      </div>

      {stats && stats.total_vencidas > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alerta: Tareas Vencidas
            </CardTitle>
            <CardDescription className="text-red-700">
              Hay {stats.total_vencidas} tarea(s) que han superado su SLA y requieren atención inmediata.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestión de Tareas</CardTitle>
            <CardDescription>Vista completa de todas las tareas del sistema</CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="my-tasks" className="space-y-4">
            <TabsList>
              <TabsTrigger value="my-tasks">Mis Tareas</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="critical">Críticas</TabsTrigger>
              <TabsTrigger value="all">Todas</TabsTrigger>
            </TabsList>

            <TabsContent value="my-tasks">
              <TasksList filter="my-tasks" onRefresh={fetchStats} />
            </TabsContent>

            <TabsContent value="pending">
              <TasksList filter="pending" onRefresh={fetchStats} />
            </TabsContent>

            <TabsContent value="critical">
              <TasksList filter="critical" onRefresh={fetchStats} />
            </TabsContent>

            <TabsContent value="all">
              <TasksList filter="all" onRefresh={fetchStats} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreateTaskDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSuccess={fetchStats} />
    </>
  )
}
