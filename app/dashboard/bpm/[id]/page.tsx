"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { WorkflowVisualEditor } from "@/components/workflows/visual-editor"
import type { Workflow, WorkflowStep } from "@/lib/types/workflow"

const isValidUUID = (str: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function WorkflowEditorPage() {
  const params = useParams()
  const id = params?.id as string | undefined
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const isNew = id === "new"

  useEffect(() => {
    if (!id || isNew) {
      setLoading(false)
      return
    }

    if (!isValidUUID(id)) {
      console.error("Invalid workflow ID:", id)
      setLoading(false)
      return
    }

    async function fetchWorkflow() {
      try {
        const response = await fetch(`/api/workflows/${id}`)
        if (!response.ok) {
          throw new Error("Error cargando workflow")
        }
        const data = await response.json()
        setWorkflow(data.workflow)
        setSteps(data.steps || [])
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchWorkflow()
  }, [id, isNew])

  const handleSave = useCallback(
    async (data: { workflow: Partial<Workflow>; steps: Array<Partial<WorkflowStep>> }) => {
      const url = isNew ? "/api/workflows" : `/api/workflows/${id}`
      const method = isNew ? "POST" : "PUT"

      const payload = {
        name: data.workflow.name,
        description: data.workflow.description,
        triggerType: data.workflow.triggerType,
        triggerConfig: data.workflow.triggerConfig,
        steps: data.steps.map((step, index) => ({
          step_key: step.id || `step-${index}`,
          name: step.name,
          type: step.type,
          config: step.config,
          next_step_on_success: step.nextStepId || null,
          position_x: 250,
          position_y: 150 + index * 150,
        })),
        entry_step_key: data.steps.length > 0 ? data.steps[0].id || "step-0" : null,
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error guardando workflow")
      }

      const result = await response.json()

      if (isNew && result.workflow?.id) {
        router.push(`/dashboard/bpm/${result.workflow.id}`)
      }
    },
    [id, isNew, router],
  )

  const handleBack = useCallback(() => {
    router.push("/dashboard/bpm")
  }, [router])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <WorkflowVisualEditor workflow={workflow} steps={steps} onSave={handleSave} onBack={handleBack} isNew={isNew} />
  )
}
