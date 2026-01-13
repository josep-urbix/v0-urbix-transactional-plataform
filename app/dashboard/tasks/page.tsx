import { Suspense } from "react"
import type { Metadata } from "next"
import { TasksDashboardContent } from "@/components/tasks/tasks-dashboard"

export const metadata: Metadata = {
  title: "Tareas - URBIX",
  description: "Dashboard de gestión de tareas",
}

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Tareas</h1>
        <p className="text-muted-foreground mt-2">Gestiona y supervisa todas las tareas del sistema</p>
      </div>
      <Suspense fallback={<div>Cargando...</div>}>
        <TasksDashboardContent />
      </Suspense>
    </div>
  )
}
