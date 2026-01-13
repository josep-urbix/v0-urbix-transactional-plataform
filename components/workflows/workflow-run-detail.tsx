"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Ban,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Mail,
  Globe,
  Server,
  GitBranch,
  Variable,
  FileText,
  Zap,
  Copy,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { WorkflowRunWithDetails, WorkflowStepRun, WorkflowStepType } from "@/lib/types/workflow"

interface WorkflowRunDetailProps {
  workflowId: string
  runId: string
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; bgColor: string; textColor: string }> =
  {
    PENDING: { label: "Pendiente", icon: Clock, bgColor: "bg-gray-100", textColor: "text-gray-700" },
    RUNNING: { label: "Ejecutando", icon: Loader2, bgColor: "bg-blue-100", textColor: "text-blue-700" },
    COMPLETED: { label: "Completado", icon: CheckCircle2, bgColor: "bg-green-100", textColor: "text-green-700" },
    FAILED: { label: "Fallido", icon: XCircle, bgColor: "bg-red-100", textColor: "text-red-700" },
    CANCELLED: { label: "Cancelado", icon: Ban, bgColor: "bg-gray-100", textColor: "text-gray-600" },
    WAITING: { label: "Esperando", icon: Clock, bgColor: "bg-amber-100", textColor: "text-amber-700" },
    SKIPPED: { label: "Omitido", icon: ChevronRight, bgColor: "bg-gray-100", textColor: "text-gray-500" },
  }

const STEP_TYPE_ICONS: Record<WorkflowStepType, typeof Mail> = {
  SEND_EMAIL: Mail,
  CALL_INTERNAL_API: Server,
  CALL_WEBHOOK: Globe,
  DELAY: Clock,
  CONDITIONAL: GitBranch,
  SET_VARIABLE: Variable,
  LOG: FileText,
}

export function WorkflowRunDetail({ workflowId, runId }: WorkflowRunDetailProps) {
  const router = useRouter()
  const [run, setRun] = useState<WorkflowRunWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedStepRun, setSelectedStepRun] = useState<WorkflowStepRun | null>(null)

  useEffect(() => {
    fetchRun()
  }, [workflowId, runId])

  async function fetchRun() {
    setLoading(true)
    try {
      const response = await fetch(`/api/workflows/${workflowId}/runs/${runId}`)
      if (response.ok) {
        const data = await response.json()
        setRun(data)
      } else {
        router.push(`/dashboard/workflows/${workflowId}/runs`)
      }
    } catch (error) {
      console.error("Error fetching run:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/runs/${runId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchRun()
      }
    } catch (error) {
      console.error("Error cancelling run:", error)
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  function formatDuration(start: string, end: string | null) {
    if (!end) return "-"
    const duration = new Date(end).getTime() - new Date(start).getTime()
    if (duration < 1000) return `${duration}ms`
    if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`
    return `${(duration / 60000).toFixed(2)}m`
  }

  function StatusBadge({ status }: { status: string }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
    const Icon = config.icon

    return (
      <Badge variant="secondary" className={`gap-1 ${config.bgColor} ${config.textColor}`}>
        <Icon className={`h-3 w-3 ${status === "RUNNING" ? "animate-spin" : ""}`} />
        {config.label}
      </Badge>
    )
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-muted-foreground">Cargando ejecución...</div>
      </div>
    )
  }

  if (!run) {
    return null
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/workflows/${workflowId}/runs`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold">Ejecución</h1>
                <StatusBadge status={run.status} />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{run.id.slice(0, 8)}...</span>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(run.id)}>
                  <Copy className="h-3 w-3" />
                </Button>
                {run.workflow_name && (
                  <>
                    <span>•</span>
                    <span>{run.workflow_name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {["PENDING", "RUNNING", "WAITING"].includes(run.status) && (
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
            )}
            <Button variant="outline" onClick={fetchRun}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Run Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información General</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Evento trigger:</span>
                    <div className="mt-1">
                      <Badge variant="outline" className="gap-1">
                        <Zap className="h-3 w-3" />
                        {run.trigger_event_name}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duración:</span>
                    <div className="mt-1 font-medium">{formatDuration(run.started_at, run.finished_at)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Inicio:</span>
                    <div className="mt-1">{formatDate(run.started_at)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fin:</span>
                    <div className="mt-1">{run.finished_at ? formatDate(run.finished_at) : "-"}</div>
                  </div>
                </div>
                {run.error_message && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700">Error</p>
                        <p className="text-sm text-red-600">{run.error_message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Steps Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pasos Ejecutados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {run.step_runs && run.step_runs.length > 0 ? (
                  run.step_runs.map((stepRun, index) => {
                    const Icon = STEP_TYPE_ICONS[(stepRun as any).step_type as WorkflowStepType] || FileText
                    const isSelected = selectedStepRun?.id === stepRun.id
                    const statusConfig = STATUS_CONFIG[stepRun.status] || STATUS_CONFIG.PENDING

                    return (
                      <Collapsible key={stepRun.id}>
                        <div className="flex items-start gap-4">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${statusConfig.bgColor}`}
                            >
                              <Icon className={`h-4 w-4 ${statusConfig.textColor}`} />
                            </div>
                            {index < run.step_runs.length - 1 && <div className="w-0.5 h-full bg-border mt-2" />}
                          </div>

                          {/* Step content */}
                          <div className="flex-1 pb-4">
                            <CollapsibleTrigger asChild>
                              <div
                                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                                  isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                                }`}
                                onClick={() => setSelectedStepRun(isSelected ? null : stepRun)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
                                        {(stepRun as any).step_name || stepRun.step_key}
                                      </span>
                                      <StatusBadge status={stepRun.status} />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {stepRun.attempt_number > 1 && `Intento ${stepRun.attempt_number} • `}
                                      {formatDuration(stepRun.started_at, stepRun.finished_at)}
                                    </p>
                                  </div>
                                  <ChevronDown
                                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                                      isSelected ? "rotate-180" : ""
                                    }`}
                                  />
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="mt-2 p-4 bg-muted/30 rounded-lg space-y-3">
                                {stepRun.error_message && (
                                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                                    <p className="text-sm text-red-600 font-mono">{stepRun.error_message}</p>
                                    {stepRun.error_stack && (
                                      <pre className="text-xs text-red-500 mt-2 overflow-auto max-h-32">
                                        {stepRun.error_stack}
                                      </pre>
                                    )}
                                  </div>
                                )}

                                {stepRun.input_data && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Input</p>
                                    <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(stepRun.input_data, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {stepRun.output_data && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Output</p>
                                    <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
                                      {JSON.stringify(stepRun.output_data, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                <div className="flex gap-4 text-xs text-muted-foreground">
                                  <span>Inicio: {formatDate(stepRun.started_at)}</span>
                                  {stepRun.finished_at && <span>Fin: {formatDate(stepRun.finished_at)}</span>}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </div>
                      </Collapsible>
                    )
                  })
                ) : (
                  <p className="text-center text-muted-foreground py-8">No hay pasos ejecutados</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Context Panel */}
        <div className="w-[400px] border-l bg-background">
          <Tabs defaultValue="trigger" className="h-full flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="trigger" className="flex-1">
                Trigger Payload
              </TabsTrigger>
              <TabsTrigger value="context" className="flex-1">
                Contexto
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 p-4">
              <TabsContent value="trigger" className="mt-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Payload del Evento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[400px]">
                      {JSON.stringify(run.trigger_payload, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="context" className="mt-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Contexto de Ejecución</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[400px]">
                      {JSON.stringify(run.context, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
