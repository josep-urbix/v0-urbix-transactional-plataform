"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, User, AlertCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  titulo: string
  tipo: string
  prioridad: string
  estado: string
  asignado_a: string | null
  asignado_nombre?: string
  fecha_vencimiento: string | null
  cuenta_virtual_id: string | null
  payment_account_id: number | null
}

export function TaskCard({ task }: { task: Task }) {
  const priorityColors = {
    CRITICA: "bg-red-500 text-white",
    ALTA: "bg-orange-500 text-white",
    MEDIA: "bg-yellow-500 text-white",
    BAJA: "bg-green-500 text-white",
  }

  const statusColors = {
    PENDIENTE: "bg-gray-200 text-gray-800",
    EN_PROGRESO: "bg-blue-200 text-blue-800",
    COMPLETADA: "bg-green-200 text-green-800",
    CANCELADA: "bg-red-200 text-red-800",
  }

  const isOverdue = task.fecha_vencimiento && new Date(task.fecha_vencimiento) < new Date()

  return (
    <Card className={cn("hover:shadow-md transition-shadow", isOverdue && "border-red-500")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Link href={`/dashboard/tasks/view/${task.id}`} className="hover:underline">
              <h3 className="font-semibold text-sm line-clamp-2">{task.titulo}</h3>
            </Link>
            <p className="text-xs text-muted-foreground mt-1">{task.tipo}</p>
          </div>
          <Badge className={priorityColors[task.prioridad as keyof typeof priorityColors]}>{task.prioridad}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <Badge variant="outline" className={statusColors[task.estado as keyof typeof statusColors]}>
            {task.estado.replace("_", " ")}
          </Badge>
          {isOverdue && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span>Vencida</span>
            </div>
          )}
        </div>

        {task.asignado_nombre && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{task.asignado_nombre}</span>
          </div>
        )}

        {task.fecha_vencimiento && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{new Date(task.fecha_vencimiento).toLocaleDateString("es-ES")}</span>
          </div>
        )}

        <div className="pt-2">
          <Link href={`/dashboard/tasks/view/${task.id}`}>
            <Button size="sm" variant="outline" className="w-full bg-transparent">
              Ver Detalles
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
