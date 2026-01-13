"use client"

import { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MoreHorizontal, Search, UserPlus, CheckCircle2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { AssignTaskDialog } from "./assign-task-dialog"
import { CompleteTaskDialog } from "./complete-task-dialog"

interface Task {
  id: string
  tipo: string
  titulo: string
  prioridad: string
  estado: string
  asignado_a: string | null
  asignado_nombre: string | null
  cuenta_virtual_id: string | null
  payment_account_id: number | null
  fecha_creacion: string
  fecha_vencimiento: string | null
  sla_vencido: boolean
}

interface TasksListProps {
  filter: "my-tasks" | "pending" | "critical" | "all"
  onRefresh?: () => void
}

export function TasksList({ filter, onRefresh }: TasksListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [taskToAssign, setTaskToAssign] = useState<Task | null>(null)
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [filter])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ filter })
      const res = await fetch(`/api/admin/tasks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchTasks()
    onRefresh?.()
  }

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTasks)
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId)
    } else {
      newSelection.add(taskId)
    }
    setSelectedTasks(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(filteredTasks.map((t) => t.id)))
    }
  }

  const handleBulkAssign = async (userId: string) => {
    if (selectedTasks.size === 0) return

    try {
      const promises = Array.from(selectedTasks).map((taskId) =>
        fetch(`/api/admin/tasks/${taskId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ asignado_a: userId }),
        }),
      )
      await Promise.all(promises)
      setSelectedTasks(new Set())
      handleRefresh()
    } catch (error) {
      console.error("Error en asignación masiva:", error)
    }
  }

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case "CRITICA":
        return "bg-red-500 text-white"
      case "ALTA":
        return "bg-orange-500 text-white"
      case "MEDIA":
        return "bg-yellow-500 text-white"
      case "BAJA":
        return "bg-green-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
        return "bg-gray-200 text-gray-800"
      case "EN_PROGRESO":
        return "bg-blue-200 text-blue-800"
      case "COMPLETADA":
        return "bg-green-200 text-green-800"
      case "CANCELADA":
        return "bg-red-200 text-red-800"
      default:
        return "bg-gray-200 text-gray-800"
    }
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = priorityFilter === "all" || task.prioridad === priorityFilter
    return matchesSearch && matchesPriority
  })

  if (loading) {
    return <div className="text-center py-8">Cargando tareas...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="CRITICA">Crítica</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="MEDIA">Media</SelectItem>
            <SelectItem value="BAJA">Baja</SelectItem>
          </SelectContent>
        </Select>
        {selectedTasks.size > 0 && <Badge variant="secondary">{selectedTasks.size} seleccionada(s)</Badge>}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Asignado</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No hay tareas para mostrar
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow key={task.id} className={task.sla_vencido ? "bg-red-50" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => toggleTaskSelection(task.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={`/dashboard/tasks/view/${task.id}`} className="font-medium hover:underline">
                      {task.titulo}
                    </Link>
                    {task.sla_vencido && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Vencida
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{task.tipo.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(task.prioridad)}>{task.prioridad}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getEstadoColor(task.estado)}>{task.estado.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{task.asignado_nombre || "Sin asignar"}</TableCell>
                  <TableCell className="text-sm">
                    {task.fecha_vencimiento
                      ? format(new Date(task.fecha_vencimiento), "dd/MM/yyyy HH:mm", { locale: es })
                      : "Sin límite"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTaskToAssign(task)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Asignar
                        </DropdownMenuItem>
                        {task.estado !== "COMPLETADA" && (
                          <DropdownMenuItem onClick={() => setTaskToComplete(task)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Completar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/tasks/view/${task.id}`}>Ver Detalle</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {taskToAssign && (
        <AssignTaskDialog
          task={taskToAssign}
          open={!!taskToAssign}
          onOpenChange={(open) => !open && setTaskToAssign(null)}
          onSuccess={handleRefresh}
        />
      )}

      {taskToComplete && (
        <CompleteTaskDialog
          task={taskToComplete}
          open={!!taskToComplete}
          onOpenChange={(open) => !open && setTaskToComplete(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  )
}
