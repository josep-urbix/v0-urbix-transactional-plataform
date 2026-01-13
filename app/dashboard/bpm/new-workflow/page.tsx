"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { WorkflowVisualEditor } from "@/components/workflows/visual-editor"
import type { Workflow, WorkflowStep } from "@/lib/types/workflow"

export default function NewWorkflowEditorPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(
    async (data: { workflow: Partial<Workflow>; steps: Array<Partial<WorkflowStep>> }) => {
      setSaving(true)
      try {
        // Construir el payload para crear un nuevo workflow
        const payload = {
          name: data.workflow.name || "Nuevo Workflow",
          description: data.workflow.description || "",
          triggerType: data.workflow.triggerType || "EVENT",
          triggerConfig: data.workflow.triggerConfig || {},
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

        const response = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Error creando workflow")
        }

        const result = await response.json()

        // Redirigir al workflow creado
        if (result.workflow?.id) {
          router.push(`/dashboard/bpm/${result.workflow.id}`)
        } else {
          router.push("/dashboard/bpm")
        }
      } catch (error) {
        console.error("Error saving workflow:", error)
        throw error
      } finally {
        setSaving(false)
      }
    },
    [router],
  )

  const handleBack = useCallback(() => {
    router.push("/dashboard/bpm")
  }, [router])

  if (saving) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <WorkflowVisualEditor workflow={null} steps={[]} onSave={handleSave} onBack={handleBack} isNew={true} />
}
