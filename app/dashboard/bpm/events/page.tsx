import { WorkflowEventsManager } from "@/components/workflows/workflow-events-manager"

export default function WorkflowEventsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Eventos de Workflow</h1>
        <p className="text-muted-foreground">Gestiona los eventos que pueden disparar workflows</p>
      </div>
      <WorkflowEventsManager />
    </div>
  )
}
