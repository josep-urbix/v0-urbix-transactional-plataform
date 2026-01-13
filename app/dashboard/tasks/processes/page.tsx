import { ProcessManager } from "@/components/tasks/process-manager"

export const metadata = {
  title: "Gestión de Procesos | URBIX",
  description: "Administra los procesos de tareas",
}

export default function ProcessesPage() {
  return (
    <div className="container mx-auto py-6">
      <ProcessManager />
    </div>
  )
}
