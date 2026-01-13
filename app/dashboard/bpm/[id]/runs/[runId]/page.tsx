import { WorkflowRunDetail } from "@/components/workflows/workflow-run-detail"

export default async function WorkflowRunDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>
}) {
  const { id, runId } = await params

  return <WorkflowRunDetail workflowId={id} runId={runId} />
}
