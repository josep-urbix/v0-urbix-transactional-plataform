import { DashboardOverview } from "@/components/dashboard-overview"
import { TasksWidget } from "@/components/tasks/tasks-widget"

export const dynamic = "force-dynamic"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardOverview />
      <TasksWidget />
    </div>
  )
}
