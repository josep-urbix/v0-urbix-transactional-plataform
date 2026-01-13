"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  GitBranch,
  Plus,
  Search,
  MoreHorizontal,
  Play,
  Pause,
  Copy,
  Trash2,
  History,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Workflow as WorkflowType, WorkflowEvent } from "@/lib/types/workflow"

interface WorkflowWithMeta extends WorkflowType {
  triggers: Array<{ id: string; event_name: string }>
  run_count: number
}

interface WorkflowItemProps {
  workflow: WorkflowWithMeta
  onEdit: () => void
  onViewRuns: () => void
  onToggleStatus: () => void
  onClone: () => void
  onDelete: () => void
}

// Separate component for workflow item to isolate rendering
function WorkflowItem({ workflow, onEdit, onViewRuns, onToggleStatus, onClone, onDelete }: WorkflowItemProps) {
  const isActive = workflow.status === "ACTIVE"

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div key="content" className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
            <GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div key="title" className="flex items-center gap-2">
            <h3 className="font-medium">{workflow.name}</h3>
            <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Activo" : "Inactivo"}</Badge>
          </div>
          {workflow.description && (
            <p key="description" className="text-sm text-muted-foreground mt-1">
              {workflow.description}
            </p>
          )}
          <WorkflowMetadata
            key="metadata"
            triggerCount={workflow.triggers?.length || 0}
            runCount={workflow.run_count || 0}
            updatedAt={formatDate(workflow.updated_at)}
          />
        </div>
      </div>
      <WorkflowActions
        key="actions"
        isActive={isActive}
        onEdit={onEdit}
        onViewRuns={onViewRuns}
        onToggleStatus={onToggleStatus}
        onClone={onClone}
        onDelete={onDelete}
      />
    </div>
  )
}

// Separate component for metadata to avoid array children issues
function WorkflowMetadata({
  triggerCount,
  runCount,
  updatedAt,
}: {
  triggerCount: number
  runCount: number
  updatedAt: string
}) {
  return (
    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
      <div key="triggers" className="flex items-center gap-1">
        <Zap className="h-3 w-3" />
        <span>{triggerCount} triggers</span>
      </div>
      <div key="executions" className="flex items-center gap-1">
        <History className="h-3 w-3" />
        <span>{runCount} ejecuciones</span>
      </div>
      <div key="updated">
        <span>Actualizado: {updatedAt}</span>
      </div>
    </div>
  )
}

// Separate component for actions to avoid fragment issues in dropdown
function WorkflowActions({
  isActive,
  onEdit,
  onViewRuns,
  onToggleStatus,
  onClone,
  onDelete,
}: {
  isActive: boolean
  onEdit: () => void
  onViewRuns: () => void
  onToggleStatus: () => void
  onClone: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={onEdit} className="gap-2">
        <GitBranch className="h-4 w-4" />
        Editar
      </Button>
      <Button variant="ghost" size="sm" onClick={onViewRuns} className="gap-2">
        <History className="h-4 w-4" />
        Ejecuciones
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onToggleStatus}>
            {isActive ? (
              <span className="flex items-center">
                <Pause className="h-4 w-4 mr-2" />
                Desactivar
              </span>
            ) : (
              <span className="flex items-center">
                <GitBranch className="h-4 w-4 mr-2" />
                Activar
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onClone}>
            <span className="flex items-center">
              <Copy className="h-4 w-4 mr-2" />
              Clonar
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <span className="flex items-center">
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// Separate component for event item
function EventItem({ event }: { event: WorkflowEvent }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Zap className="h-4 w-4 text-amber-500" />
        <div>
          <p className="font-medium text-sm">{event.event_name}</p>
          {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
        </div>
      </div>
      <Badge variant="secondary">{event.usage_count} procesos</Badge>
    </div>
  )
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function WorkflowList() {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<WorkflowWithMeta[]>([])
  const [events, setEvents] = useState<WorkflowEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [eventFilter, setEventFilter] = useState<string>("all")

  const [workflowsOpen, setWorkflowsOpen] = useState(true)
  const [eventsOpen, setEventsOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(true)

  useEffect(() => {
    fetchWorkflows()
    fetchEvents()
  }, [])

  async function fetchWorkflows() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (eventFilter !== "all") params.set("event_name", eventFilter)

      const response = await fetch(`/api/workflows?${params}`)
      const data = await response.json()

      setWorkflows(data.workflows || [])
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Error fetching workflows:", error)
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

  async function handleToggleStatus(workflow: WorkflowWithMeta) {
    const endpoint = workflow.status === "ACTIVE" ? "deactivate" : "activate"
    try {
      const response = await fetch(`/api/workflows/${workflow.id}/${endpoint}`, {
        method: "POST",
      })

      if (response.ok) {
        fetchWorkflows()
      } else {
        const error = await response.json()
        alert(error.error || "Error toggling workflow status")
      }
    } catch (error) {
      console.error("Error toggling workflow:", error)
    }
  }

  async function handleClone(workflow: WorkflowWithMeta) {
    try {
      const response = await fetch(`/api/workflows/${workflow.id}/clone`, {
        method: "POST",
      })

      if (response.ok) {
        fetchWorkflows()
      }
    } catch (error) {
      console.error("Error cloning workflow:", error)
    }
  }

  async function handleDelete(workflowId: string) {
    try {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchWorkflows()
      }
    } catch (error) {
      console.error("Error deleting workflow:", error)
    }
  }

  const activeCount = workflows.filter((w) => w.status === "ACTIVE").length
  const inactiveCount = workflows.filter((w) => w.status === "INACTIVE").length

  return (
    <div className="space-y-6">
      <div key="header" className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Business Process Manager</h1>
          <p className="text-muted-foreground">Automatiza procesos de negocio con flujos de trabajo configurables</p>
        </div>
        <Button onClick={() => router.push("/dashboard/bpm/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Proceso
        </Button>
      </div>

      {/* Stats Section */}
      <Collapsible key="stats" open={statsOpen} onOpenChange={setStatsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Estadísticas</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {total} procesos totales · {activeCount} activos
                    </p>
                  </div>
                </div>
                {statsOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-4 md:grid-cols-4">
                <div key="total-workflows" className="space-y-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Total Procesos</p>
                  </div>
                  <p className="text-2xl font-bold">{total}</p>
                </div>
                <div key="active-workflows" className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-green-500" />
                    <p className="text-sm font-medium text-muted-foreground">Activos</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                </div>
                <div key="inactive-workflows" className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Pause className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-muted-foreground">Inactivos</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-500">{inactiveCount}</p>
                </div>
                <div key="available-events" className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <p className="text-sm font-medium text-muted-foreground">Eventos Disponibles</p>
                  </div>
                  <p className="text-2xl font-bold">{events.length}</p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Workflows Section */}
      <Collapsible key="workflows" open={workflowsOpen} onOpenChange={setWorkflowsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                    <GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Procesos de Negocio</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {workflows.length} procesos · {activeCount} activos
                    </p>
                  </div>
                </div>
                {workflowsOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Filters */}
              <div className="mb-4 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ACTIVE">Activos</SelectItem>
                    <SelectItem value="INACTIVE">Inactivos</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Evento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los eventos</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.event_name} value={event.event_name}>
                        {event.event_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={fetchWorkflows}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Workflows List */}
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando procesos...</div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron procesos. Crea tu primer proceso.
                </div>
              ) : (
                <div className="space-y-2">
                  {workflows.map((workflow) => (
                    <WorkflowItem
                      key={workflow.id}
                      workflow={workflow}
                      onEdit={() => router.push(`/dashboard/bpm/${workflow.id}`)}
                      onViewRuns={() => router.push(`/dashboard/bpm/${workflow.id}/runs`)}
                      onToggleStatus={() => handleToggleStatus(workflow)}
                      onClone={() => handleClone(workflow)}
                      onDelete={() => handleDelete(workflow.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Events Section */}
      <Collapsible key="events" open={eventsOpen} onOpenChange={setEventsOpen}>
        <Card>{/* ... existing code ... */}</Card>
      </Collapsible>
    </div>
  )
}
