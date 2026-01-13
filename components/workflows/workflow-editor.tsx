"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Save,
  Play,
  Pause,
  History,
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  Mail,
  Globe,
  Clock,
  GitBranch,
  Variable,
  FileText,
  Settings2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Server,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type {
  WorkflowWithDetails,
  WorkflowStep,
  WorkflowTrigger,
  WorkflowEvent,
  WorkflowStepType,
} from "@/lib/types/workflow"

interface WorkflowEditorProps {
  workflowId: string
}

const STEP_TYPES: Array<{
  type: WorkflowStepType
  label: string
  icon: typeof Mail
  color: string
  description: string
}> = [
  {
    type: "SEND_EMAIL",
    label: "Enviar Email",
    icon: Mail,
    color: "bg-blue-500",
    description: "Envía un email usando una plantilla",
  },
  {
    type: "CALL_INTERNAL_API",
    label: "API Interna",
    icon: Server,
    color: "bg-purple-500",
    description: "Llama a un endpoint interno",
  },
  {
    type: "CALL_WEBHOOK",
    label: "Webhook",
    icon: Globe,
    color: "bg-green-500",
    description: "Llama a un webhook externo",
  },
  {
    type: "DELAY",
    label: "Espera",
    icon: Clock,
    color: "bg-amber-500",
    description: "Espera un tiempo antes de continuar",
  },
  {
    type: "CONDITIONAL",
    label: "Condición",
    icon: GitBranch,
    color: "bg-orange-500",
    description: "Bifurca según una condición",
  },
  {
    type: "SET_VARIABLE",
    label: "Variable",
    icon: Variable,
    color: "bg-cyan-500",
    description: "Define o modifica una variable",
  },
  {
    type: "LOG",
    label: "Log",
    icon: FileText,
    color: "bg-gray-500",
    description: "Registra un mensaje en el log",
  },
]

function getStepIcon(type: WorkflowStepType) {
  const stepType = STEP_TYPES.find((t) => t.type === type)
  return stepType?.icon || Settings2
}

function getStepColor(type: WorkflowStepType) {
  const stepType = STEP_TYPES.find((t) => t.type === type)
  return stepType?.color || "bg-gray-500"
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const router = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [workflow, setWorkflow] = useState<WorkflowWithDetails | null>(null)
  const [events, setEvents] = useState<WorkflowEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Selected elements
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null)
  const [selectedTrigger, setSelectedTrigger] = useState<WorkflowTrigger | null>(null)

  // Dialogs
  const [showAddStepDialog, setShowAddStepDialog] = useState(false)
  const [showAddTriggerDialog, setShowAddTriggerDialog] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [testPayload, setTestPayload] = useState("{}")
  const [testResult, setTestResult] = useState<{ triggered: number; runIds: string[] } | null>(null)

  // Local edits
  const [editedName, setEditedName] = useState("")
  const [editedDescription, setEditedDescription] = useState("")

  useEffect(() => {
    fetchWorkflow()
    fetchEvents()
  }, [workflowId])

  async function fetchWorkflow() {
    setLoading(true)
    try {
      const response = await fetch(`/api/workflows/${workflowId}`)
      if (response.ok) {
        const data = await response.json()
        const normalizedData = {
          ...data,
          triggers: data.triggers || [],
          steps: data.steps || [],
        }
        setWorkflow(normalizedData)
        setEditedName(normalizedData.name)
        setEditedDescription(normalizedData.description || "")
      } else {
        router.push("/dashboard/bpm")
      }
    } catch (error) {
      console.error("Error fetching workflow:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchEvents() {
    try {
      const response = await fetch("/api/workflows/events")
      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error("Error fetching events:", error)
    }
  }

  async function handleSave() {
    if (!workflow) return

    setSaving(true)
    try {
      const triggers = workflow.triggers || []
      const steps = workflow.steps || []

      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editedName,
          description: editedDescription,
          triggers: triggers.map((t) => ({
            event_name: t.event_name,
            filter_expression: t.filter_expression,
            description: t.description,
          })),
          steps: steps.map((s) => ({
            step_key: s.step_key,
            name: s.name,
            type: s.type,
            config: s.config,
            next_step_on_success: s.next_step_on_success,
            next_step_on_error: s.next_step_on_error,
            max_retries: s.max_retries,
            retry_delay_ms: s.retry_delay_ms,
            position_x: s.position_x,
            position_y: s.position_y,
          })),
          entry_step_key: workflow.entry_step_key,
        }),
      })

      if (response.ok) {
        setHasChanges(false)
        const updated = await response.json()
        setWorkflow({
          ...updated,
          triggers: updated.triggers || [],
          steps: updated.steps || [],
        })
      }
    } catch (error) {
      console.error("Error saving workflow:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleStatus() {
    if (!workflow) return

    const endpoint = workflow.status === "ACTIVE" ? "deactivate" : "activate"
    try {
      const response = await fetch(`/api/workflows/${workflowId}/${endpoint}`, {
        method: "POST",
      })

      if (response.ok) {
        fetchWorkflow()
      } else {
        const error = await response.json()
        alert(error.error || "Error toggling workflow status")
      }
    } catch (error) {
      console.error("Error toggling workflow:", error)
    }
  }

  async function handleTest() {
    if (!workflow || !workflow.triggers || workflow.triggers.length === 0) return

    try {
      const payload = JSON.parse(testPayload)
      const response = await fetch("/api/workflows/emit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: workflow.triggers[0].event_name,
          payload,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setTestResult(result)
      }
    } catch (error) {
      console.error("Error testing workflow:", error)
    }
  }

  function updateWorkflow(updates: Partial<WorkflowWithDetails>) {
    if (!workflow) return
    setWorkflow({ ...workflow, ...updates })
    setHasChanges(true)
  }

  function addTrigger(eventName: string) {
    if (!workflow) return

    const newTrigger: WorkflowTrigger = {
      id: `temp-${Date.now()}`,
      workflow_id: workflowId,
      event_name: eventName,
      filter_expression: null,
      description: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    updateWorkflow({ triggers: [...(workflow.triggers || []), newTrigger] })
    setShowAddTriggerDialog(false)
  }

  function removeTrigger(triggerId: string) {
    if (!workflow) return
    updateWorkflow({ triggers: (workflow.triggers || []).filter((t) => t.id !== triggerId) })
    if (selectedTrigger?.id === triggerId) {
      setSelectedTrigger(null)
    }
  }

  function addStep(type: WorkflowStepType) {
    if (!workflow) return

    const steps = workflow.steps || []

    const stepKey = `step_${Date.now()}`
    const stepType = STEP_TYPES.find((t) => t.type === type)

    const newStep: WorkflowStep = {
      id: `temp-${Date.now()}`,
      workflow_id: workflow.id, // Use workflow.id for consistency
      step_key: stepKey,
      name: stepType?.label || "Nuevo paso",
      type,
      config: getDefaultConfig(type),
      order_index: steps.length, // Add order_index
      next_step_on_success: null,
      next_step_on_error: null,
      max_retries: 3,
      retry_delay_ms: 1000,
      retry_backoff_multiplier: 2, // This was missing in the update but present in original
      position_x: 100 + steps.length * 200, // Adjusted position
      position_y: 100, // Adjusted position
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const updates: Partial<WorkflowWithDetails> = {}

    // Set as entry step if it's the first step
    if (steps.length === 0) {
      updates.entry_step_key = stepKey
    }

    // Link previous step to new step
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1]
      if (!lastStep.next_step_on_success) {
        // Ensure we're updating the steps array correctly
        const updatedSteps = [...steps]
        updatedSteps[steps.length - 1] = { ...lastStep, next_step_on_success: stepKey }
        updates.steps = updatedSteps
      }
    }

    // Always push the new step to the steps array
    updates.steps = [...steps, newStep]

    updateWorkflow(updates)
    setSelectedStep(newStep)
    setShowAddStepDialog(false)
  }

  function updateStep(stepKey: string, updates: Partial<WorkflowStep>) {
    if (!workflow) return

    const updatedSteps = (workflow.steps || []).map((s) => (s.step_key === stepKey ? { ...s, ...updates } : s))

    updateWorkflow({ steps: updatedSteps })

    if (selectedStep?.step_key === stepKey) {
      setSelectedStep({ ...selectedStep, ...updates })
    }
  }

  function removeStep(stepKey: string) {
    if (!workflow) return

    // Update references to this step
    const updatedSteps = (workflow.steps || [])
      .filter((s) => s.step_key !== stepKey)
      .map((s) => ({
        ...s,
        next_step_on_success: s.next_step_on_success === stepKey ? null : s.next_step_on_success,
        next_step_on_error: s.next_step_on_error === stepKey ? null : s.next_step_on_error,
      }))

    const updates: Partial<WorkflowWithDetails> = { steps: updatedSteps }

    // Update entry step if needed
    if (workflow.entry_step_key === stepKey) {
      updates.entry_step_key = updatedSteps.length > 0 ? updatedSteps[0].step_key : null
    }

    updateWorkflow(updates)

    if (selectedStep?.step_key === stepKey) {
      setSelectedStep(null)
    }
  }

  function getDefaultConfig(type: WorkflowStepType): Record<string, unknown> {
    switch (type) {
      case "SEND_EMAIL":
        return { templateKey: "", toTemplate: "{{trigger.email}}", variablesTemplate: {} }
      case "CALL_INTERNAL_API":
        return { method: "POST", urlPath: "/api/", bodyTemplate: {} }
      case "CALL_WEBHOOK":
        return { method: "POST", url: "https://", bodyTemplate: {} }
      case "DELAY":
        return { delayMs: 60000 }
      case "CONDITIONAL":
        return { conditionExpression: "{{trigger.value}} > 0", next_step_if_true: "", next_step_if_false: "" }
      case "SET_VARIABLE":
        return { variableName: "myVar", valueTemplate: "" }
      case "LOG":
        return { message: "Log message", level: "info" }
      default:
        return {}
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-muted-foreground">Cargando workflow...</div>
      </div>
    )
  }

  if (!workflow) {
    return null
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Top Bar */}
      <div className="border-b bg-background px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/bpm")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={editedName}
              onChange={(e) => {
                setEditedName(e.target.value)
                setHasChanges(true)
              }}
              className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
            />
            <p className="text-xs text-muted-foreground">v{workflow?.version}</p>
          </div>
          <Badge variant={workflow?.status === "ACTIVE" ? "default" : "secondary"}>
            {workflow?.status === "ACTIVE" ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/bpm/${workflowId}/runs`)}>
            <History className="h-4 w-4 mr-2" />
            Ejecuciones
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTestDialog(true)}
            disabled={!workflow.triggers || workflow.triggers.length === 0 || workflow.status !== "ACTIVE"}
          >
            <Play className="h-4 w-4 mr-2" />
            Probar
          </Button>
          <Button variant="outline" onClick={handleToggleStatus}>
            {workflow.status === "ACTIVE" ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Desactivar
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Activar
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 bg-muted/30 overflow-auto p-6">
          <div className="min-h-full space-y-4">
            {/* Triggers Section */}
            <Card className="max-w-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Triggers
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddTriggerDialog(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(workflow.triggers || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin triggers configurados</p>
                ) : (
                  workflow.triggers.map((trigger) => (
                    <div
                      key={trigger.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTrigger?.id === trigger.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => {
                        setSelectedTrigger(trigger)
                        setSelectedStep(null)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{trigger.event_name}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeTrigger(trigger.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      {trigger.filter_expression && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{trigger.filter_expression}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Arrow */}
            {(workflow.triggers || []).length > 0 && (workflow.steps || []).length > 0 && (
              <div className="flex justify-center">
                <div className="h-8 w-0.5 bg-border relative">
                  <ChevronRight className="h-4 w-4 absolute -bottom-2 -left-[7px] rotate-90 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Steps */}
            {(workflow.steps || []).map((step, index) => {
              const Icon = getStepIcon(step.type)
              const isSelected = selectedStep?.step_key === step.step_key
              const isEntryStep = workflow.entry_step_key === step.step_key

              return (
                <div key={step.step_key}>
                  <Card
                    className={`max-w-md cursor-pointer transition-all ${
                      isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"
                    }`}
                    onClick={() => {
                      setSelectedStep(step)
                      setSelectedTrigger(null)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${getStepColor(step.type)} text-white`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{step.name}</span>
                            {isEntryStep && (
                              <Badge variant="outline" className="text-xs">
                                Inicio
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{step.step_key}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeStep(step.step_key)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Connection arrow */}
                  {(step.next_step_on_success || index < (workflow.steps || []).length - 1) && (
                    <div className="flex justify-center">
                      <div className="h-8 w-0.5 bg-border relative">
                        <ChevronRight className="h-4 w-4 absolute -bottom-2 -left-[7px] rotate-90 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add Step Button */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={() => setShowAddStepDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Añadir Paso
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-[400px] border-l bg-background overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            {selectedStep ? (
              <StepConfigPanel
                step={selectedStep}
                allSteps={workflow.steps || []}
                onUpdate={(updates) => updateStep(selectedStep.step_key, updates)}
                isEntryStep={workflow.entry_step_key === selectedStep.step_key}
                onSetAsEntry={() => updateWorkflow({ entry_step_key: selectedStep.step_key })}
              />
            ) : selectedTrigger ? (
              <TriggerConfigPanel
                trigger={selectedTrigger}
                events={events}
                onUpdate={(updates) => {
                  const updatedTriggers = (workflow.triggers || []).map((t) =>
                    t.id === selectedTrigger.id ? { ...t, ...updates } : t,
                  )
                  updateWorkflow({ triggers: updatedTriggers })
                  setSelectedTrigger({ ...selectedTrigger, ...updates })
                  setHasChanges(true)
                }}
              />
            ) : (
              <WorkflowConfigPanel
                description={editedDescription}
                onDescriptionChange={(desc) => {
                  setEditedDescription(desc)
                  setHasChanges(true)
                }}
                triggersCount={(workflow.triggers || []).length}
                stepsCount={(workflow.steps || []).length}
              />
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Add Step Dialog */}
      <Dialog open={showAddStepDialog} onOpenChange={setShowAddStepDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Añadir Paso</DialogTitle>
            <DialogDescription>Selecciona el tipo de acción que quieres añadir al workflow</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {STEP_TYPES.map((stepType) => {
              const Icon = stepType.icon
              return (
                <Card
                  key={stepType.type}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => addStep(stepType.type)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${stepType.color} text-white shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{stepType.label}</h4>
                      <p className="text-sm text-muted-foreground">{stepType.description}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Trigger Dialog */}
      <Dialog open={showAddTriggerDialog} onOpenChange={setShowAddTriggerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Trigger</DialogTitle>
            <DialogDescription>Selecciona el evento que disparará este workflow</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-[400px] overflow-auto">
            {events.map((event) => (
              <Card
                key={event.event_name}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => addTrigger(event.event_name)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">{event.event_name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {event.category}
                    </Badge>
                  </div>
                  {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Probar Workflow</DialogTitle>
            <DialogDescription>
              Emite el evento &quot;{workflow.triggers?.[0]?.event_name || "N/A"}&quot; con un payload de prueba
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payload (JSON)</Label>
              <Textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="font-mono text-sm h-32"
                placeholder='{"userId": "123", "email": "test@example.com"}'
              />
            </div>
            {testResult && (
              <div className="p-4 rounded-lg bg-muted">
                {testResult.triggered > 0 ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      Se iniciaron {testResult.triggered} ejecucion(es): {testResult.runIds.join(", ")}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>No se disparó ningún workflow</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              Cerrar
            </Button>
            <Button onClick={handleTest}>
              <Play className="h-4 w-4 mr-2" />
              Ejecutar Prueba
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =====================================================
// STEP CONFIG PANEL
// =====================================================
function StepConfigPanel({
  step,
  allSteps,
  onUpdate,
  isEntryStep,
  onSetAsEntry,
}: {
  step: WorkflowStep
  allSteps: WorkflowStep[]
  onUpdate: (updates: Partial<WorkflowStep>) => void
  isEntryStep: boolean
  onSetAsEntry: () => void
}) {
  const Icon = getStepIcon(step.type)
  const config = step.config as Record<string, unknown>

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${getStepColor(step.type)} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">{step.name}</h3>
          <p className="text-xs text-muted-foreground">{step.type}</p>
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList className="w-full">
          <TabsTrigger value="config" className="flex-1">
            Configuración
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex-1">
            Avanzado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 pt-4">
          {/* Common fields */}
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={step.name} onChange={(e) => onUpdate({ name: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Clave única</Label>
            <Input
              value={step.step_key}
              onChange={(e) => onUpdate({ step_key: e.target.value })}
              className="font-mono text-sm"
            />
          </div>

          {/* Type-specific config */}
          {step.type === "SEND_EMAIL" && (
            <>
              <div className="space-y-2">
                <Label>Plantilla de Email</Label>
                <Input
                  value={(config.templateKey as string) || ""}
                  onChange={(e) => onUpdate({ config: { ...config, templateKey: e.target.value } })}
                  placeholder="welcome, reset-password..."
                />
              </div>
              <div className="space-y-2">
                <Label>Destinatario (template)</Label>
                <Input
                  value={(config.toTemplate as string) || ""}
                  onChange={(e) => onUpdate({ config: { ...config, toTemplate: e.target.value } })}
                  placeholder="{{trigger.email}}"
                  className="font-mono text-sm"
                />
              </div>
            </>
          )}

          {step.type === "CALL_INTERNAL_API" && (
            <>
              <div className="space-y-2">
                <Label>Método HTTP</Label>
                <Select
                  value={(config.method as string) || "GET"}
                  onValueChange={(value) => onUpdate({ config: { ...config, method: value } })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>URL Path</Label>
                <Input
                  value={(config.urlPath as string) || ""}
                  onChange={(e) => onUpdate({ config: { ...config, urlPath: e.target.value } })}
                  placeholder="/api/users/{{trigger.userId}}"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Body Template (JSON)</Label>
                <Textarea
                  value={
                    typeof config.bodyTemplate === "string"
                      ? config.bodyTemplate
                      : JSON.stringify(config.bodyTemplate || {}, null, 2)
                  }
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      onUpdate({ config: { ...config, bodyTemplate: parsed } })
                    } catch {
                      onUpdate({ config: { ...config, bodyTemplate: e.target.value } })
                    }
                  }}
                  className="font-mono text-sm h-24"
                  placeholder='{"userId": "{{trigger.userId}}"}'
                />
              </div>
            </>
          )}

          {step.type === "CALL_WEBHOOK" && (
            <>
              <div className="space-y-2">
                <Label>Método HTTP</Label>
                <Select
                  value={(config.method as string) || "POST"}
                  onValueChange={(value) => onUpdate({ config: { ...config, method: value } })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={(config.url as string) || ""}
                  onChange={(e) => onUpdate({ config: { ...config, url: e.target.value } })}
                  placeholder="https://api.example.com/webhook"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Body Template (JSON)</Label>
                <Textarea
                  value={
                    typeof config.bodyTemplate === "string"
                      ? config.bodyTemplate
                      : JSON.stringify(config.bodyTemplate || {}, null, 2)
                  }
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      onUpdate({ config: { ...config, bodyTemplate: parsed } })
                    } catch {
                      onUpdate({ config: { ...config, bodyTemplate: e.target.value } })
                    }
                  }}
                  className="font-mono text-sm h-24"
                />
              </div>
            </>
          )}

          {step.type === "DELAY" && (
            <div className="space-y-2">
              <Label>Tiempo de espera (ms)</Label>
              <Input
                type="number"
                value={(config.delayMs as number) || 0}
                onChange={(e) => onUpdate({ config: { ...config, delayMs: Number.parseInt(e.target.value) } })}
              />
              <p className="text-xs text-muted-foreground">
                {((config.delayMs as number) || 0) >= 60000
                  ? `${Math.round(((config.delayMs as number) || 0) / 60000)} minuto(s)`
                  : `${((config.delayMs as number) || 0) / 1000} segundo(s)`}
              </p>
            </div>
          )}

          {step.type === "CONDITIONAL" && (
            <>
              <div className="space-y-2">
                <Label>Expresión condicional</Label>
                <Textarea
                  value={(config.conditionExpression as string) || ""}
                  onChange={(e) => onUpdate({ config: { ...config, conditionExpression: e.target.value } })}
                  placeholder="{{trigger.amount}} > 1000"
                  className="font-mono text-sm h-20"
                />
              </div>
              <div className="space-y-2">
                <Label>Si es verdadero, ir a:</Label>
                <Select
                  value={(config.next_step_if_true as string) || "_none"}
                  onValueChange={(value) =>
                    onUpdate({ config: { ...config, next_step_if_true: value === "_none" ? "" : value } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar paso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Ninguno</SelectItem>
                    {allSteps
                      .filter((s) => s.step_key !== step.step_key)
                      .map((s) => (
                        <SelectItem key={s.step_key} value={s.step_key}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Si es falso, ir a:</Label>
                <Select
                  value={(config.next_step_if_false as string) || "_none"}
                  onValueChange={(value) =>
                    onUpdate({ config: { ...config, next_step_if_false: value === "_none" ? "" : value } })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar paso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Ninguno</SelectItem>
                    {allSteps
                      .filter((s) => s.step_key !== step.step_key)
                      .map((s) => (
                        <SelectItem key={s.step_key} value={s.step_key}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step.type === "SET_VARIABLE" && (
            <>
              <div className="space-y-2">
                <Label>Nombre de variable</Label>
                <Input
                  value={(config.variableName as string) || ""}
                  onChange={(e) => onUpdate({ config: { ...config, variableName: e.target.value } })}
                  placeholder="myVariable"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (template)</Label>
                <Textarea
                  value={
                    typeof config.valueTemplate === "string"
                      ? config.valueTemplate
                      : JSON.stringify(config.valueTemplate || "", null, 2)
                  }
                  onChange={(e) => onUpdate({ config: { ...config, valueTemplate: e.target.value } })}
                  placeholder="{{trigger.userId}}"
                  className="font-mono text-sm h-20"
                />
              </div>
            </>
          )}

          {step.type === "LOG" && (
            <>
              <div className="space-y-2">
                <Label>Mensaje</Label>
                <Textarea
                  value={(config.message as string) || ""}
                  onChange={(e) => onUpdate({ config: { ...config, message: e.target.value } })}
                  placeholder="Usuario {{trigger.userId}} procesado"
                  className="font-mono text-sm h-20"
                />
              </div>
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Select
                  value={(config.level as string) || "info"}
                  onValueChange={(value) => onUpdate({ config: { ...config, level: value } })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debug">Debug</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Siguiente paso (éxito)</Label>
            <Select
              value={step.next_step_on_success || "_none"}
              onValueChange={(value) => onUpdate({ next_step_on_success: value === "_none" ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fin del workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Fin del workflow</SelectItem>
                {allSteps
                  .filter((s) => s.step_key !== step.step_key)
                  .map((s) => (
                    <SelectItem key={s.step_key} value={s.step_key}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Siguiente paso (error)</Label>
            <Select
              value={step.next_step_on_error || "_none"}
              onValueChange={(value) => onUpdate({ next_step_on_error: value === "_none" ? null : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fallar workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Fallar workflow</SelectItem>
                {allSteps
                  .filter((s) => s.step_key !== step.step_key)
                  .map((s) => (
                    <SelectItem key={s.step_key} value={s.step_key}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Máximo de reintentos</Label>
            <Input
              type="number"
              value={step.max_retries}
              onChange={(e) => onUpdate({ max_retries: Number.parseInt(e.target.value) })}
              min={0}
              max={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Delay entre reintentos (ms)</Label>
            <Input
              type="number"
              value={step.retry_delay_ms}
              onChange={(e) => onUpdate({ retry_delay_ms: Number.parseInt(e.target.value) })}
              min={100}
            />
          </div>

          <div className="pt-4 border-t">
            {!isEntryStep && (
              <Button variant="outline" size="sm" onClick={onSetAsEntry}>
                Establecer como paso inicial
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =====================================================
// TRIGGER CONFIG PANEL
// =====================================================
function TriggerConfigPanel({
  trigger,
  events,
  onUpdate,
}: {
  trigger: WorkflowTrigger
  events: WorkflowEvent[]
  onUpdate: (updates: Partial<WorkflowTrigger>) => void
}) {
  const event = events.find((e) => e.event_name === trigger.event_name)

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-amber-500 text-white">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Trigger</h3>
          <p className="text-xs text-muted-foreground">{trigger.event_name}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Evento</Label>
          <Select value={trigger.event_name} onValueChange={(value) => onUpdate({ event_name: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.event_name} value={e.event_name}>
                  {e.event_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {event?.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
        </div>

        <div className="space-y-2">
          <Label>Filtro (opcional)</Label>
          <Textarea
            value={trigger.filter_expression || ""}
            onChange={(e) => onUpdate({ filter_expression: e.target.value || null })}
            placeholder="{{trigger.amount}} > 1000 && {{trigger.country}} == 'ES'"
            className="font-mono text-sm h-24"
          />
          <p className="text-xs text-muted-foreground">Solo se ejecutará si la expresión es verdadera</p>
        </div>

        <div className="space-y-2">
          <Label>Descripción (opcional)</Label>
          <Textarea
            value={trigger.description || ""}
            onChange={(e) => onUpdate({ description: e.target.value || null })}
            placeholder="Describe cuándo se activa este trigger..."
            className="h-20"
          />
        </div>
      </div>
    </div>
  )
}

// =====================================================
// WORKFLOW CONFIG PANEL
// =====================================================
function WorkflowConfigPanel({
  description,
  onDescriptionChange,
  triggersCount,
  stepsCount,
}: {
  description: string
  onDescriptionChange: (desc: string) => void
  triggersCount: number
  stepsCount: number
}) {
  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary text-primary-foreground">
          <GitBranch className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Configuración del Workflow</h3>
          <p className="text-xs text-muted-foreground">Selecciona un elemento para editarlo</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Descripción</Label>
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe qué hace este workflow..."
            className="h-24"
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{triggersCount}</div>
              <div className="text-xs text-muted-foreground">Triggers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stepsCount}</div>
              <div className="text-xs text-muted-foreground">Pasos</div>
            </CardContent>
          </Card>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Variables disponibles</h4>
          <div className="space-y-1 text-xs text-muted-foreground font-mono">
            <p>{"{{trigger.*}}"} - Datos del evento</p>
            <p>{"{{steps.step_key.*}}"} - Output de pasos</p>
            <p>{"{{variables.*}}"} - Variables custom</p>
            <p>{"{{_meta.workflow_id}}"} - ID del workflow</p>
            <p>{"{{_meta.workflow_run_id}}"} - ID de ejecución</p>
          </div>
        </div>
      </div>
    </div>
  )
}
