"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import { Save, Play, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { WorkflowCanvas } from "./workflow-canvas"
import { WorkflowSidebarPalette } from "./workflow-sidebar-palette"
import { WorkflowInspectorPanel } from "./workflow-inspector-panel"
import { useWorkflowCanvas } from "./hooks/use-workflow-canvas"
import type { Workflow, WorkflowStep, WorkflowStepType } from "@/lib/types/workflow"

interface WorkflowVisualEditorProps {
  workflow: Workflow | null
  steps: WorkflowStep[]
  onSave: (data: { workflow: Partial<Workflow>; steps: Array<Partial<WorkflowStep>> }) => Promise<void>
  onBack: () => void
  isNew?: boolean
}

function WorkflowVisualEditorInner({ workflow, steps, onSave, onBack, isNew = false }: WorkflowVisualEditorProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [workflowName, setWorkflowName] = useState(workflow?.name || "Nuevo Workflow")
  const draggedStepRef = useRef<{ type: WorkflowStepType; label: string } | null>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  const {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    addNode,
    updateNode,
    deleteNode,
    clearSelection,
    toWorkflowData,
  } = useWorkflowCanvas({ workflow, steps })

  const handleDragStart = useCallback((type: WorkflowStepType, label: string) => {
    draggedStepRef.current = { type, label }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (!draggedStepRef.current || !reactFlowWrapper.current) return

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = {
        x: event.clientX - bounds.left - 100,
        y: event.clientY - bounds.top - 30,
      }

      addNode(draggedStepRef.current.type, draggedStepRef.current.label, position)
      draggedStepRef.current = null
    },
    [addNode],
  )

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const data = toWorkflowData()
      data.workflow.name = workflowName
      await onSave(data)
      toast({
        title: "Workflow guardado",
        description: "Los cambios se han guardado correctamente",
      })
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }, [toWorkflowData, workflowName, onSave, toast])

  const handleUpdateNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      if (nodeId === "trigger" && data.name) {
        setWorkflowName(data.name as string)
      }
      updateNode(nodeId, data)
    },
    [updateNode],
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-64 font-medium"
            placeholder="Nombre del workflow"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Play className="mr-2 h-4 w-4" />
            Probar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Palette */}
        <WorkflowSidebarPalette onDragStart={handleDragStart} />

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <WorkflowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          />
        </div>

        {/* Inspector Panel */}
        <WorkflowInspectorPanel
          selectedNode={
            selectedNode
              ? {
                  id: selectedNode.id,
                  type: selectedNode.type as "trigger" | "step",
                  data: selectedNode.data,
                }
              : null
          }
          onClose={clearSelection}
          onUpdateNode={handleUpdateNode}
          onDeleteNode={deleteNode}
        />
      </div>
    </div>
  )
}

export function WorkflowVisualEditor(props: WorkflowVisualEditorProps) {
  return (
    <ReactFlowProvider>
      <WorkflowVisualEditorInner {...props} />
    </ReactFlowProvider>
  )
}
