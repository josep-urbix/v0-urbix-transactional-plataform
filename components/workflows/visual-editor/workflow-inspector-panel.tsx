"use client"

import { useState } from "react"
import { X, Trash2, Settings, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { SendEmailForm, CallApiForm, DelayForm, ConditionalForm, SetVariableForm, LogForm } from "./config-forms"
import type { WorkflowStepType } from "@/lib/types/workflow"

interface SelectedNode {
  id: string
  type: "trigger" | "step"
  data: {
    stepId?: string
    stepType?: WorkflowStepType
    triggerType?: string
    name: string
    config: Record<string, unknown>
  }
}

interface WorkflowInspectorPanelProps {
  selectedNode: SelectedNode | null
  onClose: () => void
  onUpdateNode: (nodeId: string, data: Partial<SelectedNode["data"]>) => void
  onDeleteNode: (nodeId: string) => void
}

export function WorkflowInspectorPanel({
  selectedNode,
  onClose,
  onUpdateNode,
  onDeleteNode,
}: WorkflowInspectorPanelProps) {
  const [activeTab, setActiveTab] = useState("config")
  const [renderError, setRenderError] = useState<string | null>(null)

  if (!selectedNode) {
    return (
      <div className="flex h-full w-80 flex-col items-center justify-center border-l bg-muted/30 p-6 text-center">
        <Settings className="mb-4 h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Selecciona un nodo para ver sus propiedades</p>
      </div>
    )
  }

  const isTrigger = selectedNode.type === "trigger"

  const handleNameChange = (name: string) => {
    onUpdateNode(selectedNode.id, { name })
  }

  const handleConfigChange = (config: Record<string, unknown>) => {
    onUpdateNode(selectedNode.id, { config })
  }

  const renderConfigForm = () => {
    try {
      if (!selectedNode || !selectedNode.data) {
        console.log("[v0] selectedNode or data is null:", selectedNode)
        return <p className="text-sm text-muted-foreground">No hay datos del nodo seleccionado</p>
      }

      console.log("[v0] Rendering config form for:", {
        type: selectedNode.type,
        stepType: selectedNode.data.stepType,
        config: selectedNode.data.config,
      })

      if (isTrigger) {
        return (
          <div className="space-y-4">
            <div className="rounded-lg border bg-emerald-50 p-3 dark:bg-emerald-950">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Trigger: {selectedNode.data.triggerType}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                El trigger define cuándo se inicia el workflow. Sus datos están disponibles como {"{{trigger.campo}}"}.
              </p>
            </div>
          </div>
        )
      }

      const config = selectedNode.data.config ?? {}

      switch (selectedNode.data.stepType) {
        case "SEND_EMAIL":
          return <SendEmailForm config={config} onChange={handleConfigChange} />
        case "CALL_INTERNAL_API":
          return <CallApiForm config={config} onChange={handleConfigChange} />
        case "CALL_WEBHOOK":
          return <CallApiForm config={config} onChange={handleConfigChange} isWebhook />
        case "DELAY":
          return <DelayForm config={config} onChange={handleConfigChange} />
        case "CONDITIONAL":
          return <ConditionalForm config={config} onChange={handleConfigChange} />
        case "SET_VARIABLE":
          return <SetVariableForm config={config} onChange={handleConfigChange} />
        case "LOG":
          return <LogForm config={config} onChange={handleConfigChange} />
        default:
          console.log("[v0] Unknown stepType:", selectedNode.data.stepType)
          return (
            <p className="text-sm text-muted-foreground">Tipo de paso no reconocido: {selectedNode.data.stepType}</p>
          )
      }
    } catch (error) {
      console.error("[v0] Error rendering config form:", error)
      setRenderError(error instanceof Error ? error.message : "Error desconocido al renderizar el formulario")
      return (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">Error al cargar el formulario</p>
          <p className="mt-1 text-xs text-muted-foreground">{renderError}</p>
        </div>
      )
    }
  }

  return (
    <div className="flex h-full w-80 flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">{isTrigger ? "Trigger" : "Paso"}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid w-auto grid-cols-2">
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="advanced">Avanzado</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="config" className="m-0 p-4">
            <div className="space-y-4">
              {/* Nombre del nodo */}
              <div className="space-y-2">
                <Label htmlFor="node-name">Nombre</Label>
                <Input
                  id="node-name"
                  value={selectedNode.data.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Nombre del paso"
                />
              </div>

              {/* Formulario específico del tipo */}
              {renderConfigForm()}
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="m-0 p-4">
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium">ID del Nodo</p>
                <code className="text-xs text-muted-foreground">{selectedNode.id}</code>
              </div>

              {selectedNode.data.stepId && (
                <div className="rounded-lg border p-3">
                  <p className="text-sm font-medium">ID del Paso</p>
                  <code className="text-xs text-muted-foreground">{selectedNode.data.stepId}</code>
                </div>
              )}

              {/* Eliminar nodo */}
              {!isTrigger && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar Paso
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar este paso?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. El paso y todas sus conexiones serán eliminados.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteNode(selectedNode.id)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
