"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ListTodo, AlertCircle, Clock } from "lucide-react"
import Link from "next/link"

interface Task {
  id: string
  titulo: string
  prioridad: string
  fecha_vencimiento: string | null
  tipo: string
}

export function TasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [criticalCount, setCriticalCount] = useState(0)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch("/api/admin/tasks?limit=5&sortBy=prioridad")
        if (response.ok) {
          const data = await response.json()
          setTasks(data.tasks.slice(0, 5))
          setCriticalCount(data.tasks.filter((t: Task) => t.prioridad === "CRITICA").length)
        }
      } catch (error) {
        console.error("Error al cargar tareas:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [])

  const priorityColors = {
    CRITICA: "bg-red-500",
    ALTA: "bg-orange-500",
    MEDIA: "bg-yellow-500",
    BAJA: "bg-green-500",
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Mis Tareas Pendientes
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {criticalCount} Críticas
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Tareas más urgentes asignadas a ti</CardDescription>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tienes tareas pendientes</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <Link key={task.id} href={`/dashboard/tasks/view/${task.id}`}>
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div
                    className={`w-1 h-12 rounded ${priorityColors[task.prioridad as keyof typeof priorityColors]}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.titulo}</p>
                    <p className="text-xs text-muted-foreground">{task.tipo}</p>
                  </div>
                  {task.fecha_vencimiento && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(task.fecha_vencimiento).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Link href="/dashboard/tasks">
            <Button variant="outline" className="w-full bg-transparent">
              Ver Todas las Tareas
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
