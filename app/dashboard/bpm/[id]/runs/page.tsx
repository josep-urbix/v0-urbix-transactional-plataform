import { sql } from "@/lib/db"
import { WorkflowRunsList } from "@/components/workflows/workflow-runs-list"

export default async function WorkflowRunsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Fetch workflow name
  let workflowName = ""
  try {
    const result = await sql`SELECT name FROM workflows."Workflow" WHERE id = ${id}`
    if (result.length > 0) {
      workflowName = result[0].name
    }
  } catch (error) {
    console.error("Error fetching workflow name:", error)
  }

  return <WorkflowRunsList workflowId={id} workflowName={workflowName} />
}
