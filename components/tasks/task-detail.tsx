"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TaskComments } from "./task-comments"
import { AssignTaskDialog } from "./assign-task-dialog"
import { CompleteTaskDialog } from "./complete-task-dialog"
import { AlertCircle, ArrowLeft, Calendar, Clock, User } from "lucide-react"

interface Task {
  id: string
  tipo: string
  prioridad: string
  estado: string
  titulo: string
  descripcion: string
  asignado_a: string | null
  cuenta_virtual_id: string | null
  payment_account_id: number | null
  fecha_creacion: string
  fecha_vencimiento: string | null
  fecha_completada: string | null
  contexto: any
  creada_por: string
}

export function TaskDetail({ taskId }: { taskId: string }) {
  const router = useRouter()
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTask = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/tasks/view/${taskId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cargar tarea")
      }
      const data = await response.json()
      setTask(data.task)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTask()
  }, [taskId])

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICA":
        return "bg-red-500"
      case "ALTA":
        return "bg-orange-500"
      case "MEDIA":
        return "bg-yellow-500"
      case "BAJA":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETADA":
        return "bg-green-100 text-green-800"
      case "EN_PROGRESO":
        return "bg-blue-100 text-blue-800"
      case "CANCELADA":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const handleMarkInProgress = async () => {
    try {
      const response = await fetch(`/api/admin/tasks/view/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "EN_PROGRESO" }),
      })
      if (!response.ok) throw new Error("Error al actualizar tarea")
      fetchTask()
    } catch (err) {
      console.error("Error:", err)
    }
  }

  if (loading) return <div className="p-8">Cargando tarea...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!task) return <div className="p-8">Tarea no encontrada</div>

  const isOverdue =
    task.estado !== "COMPLETADA" && task.fecha_vencimiento && new Date(task.fecha_vencimiento) < new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/dashboard/tasks")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Tareas
        </Button>
        <div className="flex gap-2">
          {task.estado === "PENDIENTE" && <Button onClick={handleMarkInProgress}>Marcar En Progreso</Button>}
          <AssignTaskDialog taskId={task.id} currentAssignee={task.asignado_a} onSuccess={fetchTask} />
          <CompleteTaskDialog
            taskId={task.id}
            cuentaVirtualId={task.cuenta_virtual_id}
            onSuccess={() => router.push("/dashboard/tasks")}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{task.titulo}</CardTitle>
              <div className="flex gap-2">
                <Badge className={getPriorityColor(task.prioridad)}>{task.prioridad}</Badge>
                <Badge className={getStatusColor(task.estado)}>{task.estado.replace("_", " ")}</Badge>
                <Badge variant="outline">{task.tipo.replace("_", " ")}</Badge>
              </div>
            </div>
            {isOverdue && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Vencida
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Descripción</h3>
            <p className="text-muted-foreground">{task.descripcion}</p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Asignado a</p>
                <p className="font-medium">{task.asignado_a || "Sin asignar"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Creado por</p>
                <p className="font-medium">{task.creada_por}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Fecha creación</p>
                <p className="font-medium">{new Date(task.fecha_creacion).toLocaleString("es-ES")}</p>
              </div>
            </div>
            {task.fecha_vencimiento && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Vencimiento</p>
                  <p className="font-medium">{new Date(task.fecha_vencimiento).toLocaleString("es-ES")}</p>
                </div>
              </div>
            )}
          </div>

          {task.contexto && Object.keys(task.contexto).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Contexto Adicional</h3>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(task.contexto, null, 2)}
                </pre>
              </div>
            </>
          )}

          {(task.cuenta_virtual_id || task.payment_account_id) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Referencias</h3>
                <div className="space-y-2">
                  {task.cuenta_virtual_id && (
                    <div>
                      <p className="text-sm text-muted-foreground">Cuenta Virtual</p>
                      <p className="font-mono text-sm">{task.cuenta_virtual_id}</p>
                    </div>
                  )}
                  {task.payment_account_id && (
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Account</p>
                      <p className="font-mono text-sm">{task.payment_account_id}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <TaskComments taskId={task.id} />
    </div>
  )
}
