import { Suspense } from "react"
import { TaskDetail } from "@/components/tasks/task-detail"

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<div>Cargando tarea...</div>}>
        <TaskDetail taskId={id} />
      </Suspense>
    </div>
  )
}
