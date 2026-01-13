"use client"

import { useState } from "react"
import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  PlayIcon,
  PauseIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  Trash2Icon,
  PencilIcon,
  PlusIcon,
  ZapIcon,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Error fetching data")
  return res.json()
}

interface CronJob {
  id: number
  unique_id?: string
  name: string
  description: string
  endpoint: string
  schedule: string
  is_active: boolean
  last_run_at: string | null
  last_run_status: string | null
  last_run_duration_ms: number | null
  last_run_error: string | null
  total_runs: number
  successful_runs: number
  failed_runs: number
  recent_executions: Array<{
    id: number
    started_at: string
    finished_at: string | null
    duration_ms: number | null
    status: string
    error_message: string | null
  }>
}

export function CronJobsManager() {
  const { data, mutate } = useSWR<{ cronJobs: CronJob[] }>("/api/cron-jobs", fetcher, {
    refreshInterval: 10000,
  })

  const [selectedJob, setSelectedJob] = useState<CronJob | null>(null)
  const [executionsDialogOpen, setExecutionsDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState<CronJob | null>(null)
  const [executingJobId, setExecutingJobId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<{
    id?: number
    name: string
    description: string
    endpoint: string
    schedule: string
    is_active: boolean
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    setEditForm({
      name: "",
      description: "",
      endpoint: "",
      schedule: "0 * * * *",
      is_active: true,
    })
    setCreateDialogOpen(true)
  }

  const handleEdit = (job: CronJob) => {
    setEditForm({
      id: job.id,
      name: job.name,
      description: job.description,
      endpoint: job.endpoint,
      schedule: job.schedule,
      is_active: job.is_active,
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editForm) return
    setIsLoading(true)
    setError(null)

    try {
      const method = editForm.id ? "PUT" : "POST"
      const res = await fetch("/api/cron-jobs", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Error saving cron job")
      }

      mutate()
      setEditDialogOpen(false)
      setCreateDialogOpen(false)
      setEditForm(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = (job: CronJob) => {
    setJobToDelete(job)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/cron-jobs?id=${jobToDelete.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Error deleting cron job")
      }

      mutate()
      setDeleteConfirmOpen(false)
      setJobToDelete(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (job: CronJob) => {
    setIsLoading(true)
    try {
      await fetch("/api/cron-jobs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: job.id,
          is_active: !job.is_active,
          name: job.name,
          description: job.description,
          endpoint: job.endpoint,
          schedule: job.schedule,
        }),
      })
      mutate()
    } catch (error) {
      console.error("Error toggling cron job:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecuteNow = async (job: CronJob) => {
    setExecutingJobId(job.id)
    try {
      const res = await fetch("/api/cron-jobs/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronJobId: job.id }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Error executing cron job")
      }

      const result = await res.json()
      console.log("[CronJobsManager] Job executed:", result)

      // Refresh data immediately and then every second for a few seconds to see the execution
      mutate()
      setTimeout(() => mutate(), 1000)
      setTimeout(() => mutate(), 2000)
    } catch (err: any) {
      console.error("[CronJobsManager] Error executing job:", err)
      setError(err.message)
    } finally {
      setExecutingJobId(null)
    }
  }

  const cronJobs = data?.cronJobs || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tareas Programadas (Cron Jobs)</h2>
          <p className="text-muted-foreground">
            Gestiona las tareas automáticas del sistema y revisa sus logs de ejecución
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <PlusIcon className="w-4 h-4" />
          Nuevo Cron Job
        </Button>
      </div>

      {error && <div className="p-4 bg-destructive/10 text-destructive rounded">{error}</div>}

      <div className="grid gap-4">
        {cronJobs.map((job) => (
          <Card key={job.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{job.name}</h3>
                  <Badge variant={job.is_active ? "default" : "secondary"}>
                    {job.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                  {job.last_run_status && (
                    <Badge variant={job.last_run_status === "success" ? "default" : "destructive"}>
                      {job.last_run_status === "success" ? (
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                      ) : (
                        <XCircleIcon className="w-3 h-3 mr-1" />
                      )}
                      {job.last_run_status}
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-3">{job.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  {job.unique_id && (
                    <div>
                      <span className="text-muted-foreground">ID Único:</span>
                      <p className="font-mono text-xs truncate" title={job.unique_id}>
                        {job.unique_id.substring(0, 8)}...
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Endpoint:</span>
                    <p className="font-mono text-xs truncate">{job.endpoint}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Programación:</span>
                    <p className="font-mono">{job.schedule}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Última ejecución:</span>
                    <p>
                      {job.last_run_at
                        ? formatDistanceToNow(new Date(job.last_run_at), {
                            addSuffix: true,
                            locale: es,
                          })
                        : "Nunca"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ejecuciones:</span>
                    <p>
                      {job.total_runs} ({job.successful_runs} ok, {job.failed_runs} err)
                    </p>
                  </div>
                </div>

                {job.last_run_error && (
                  <div className="p-3 bg-destructive/10 rounded text-sm text-destructive">
                    <strong>Último error:</strong> {job.last_run_error}
                  </div>
                )}
              </div>

              <div className="flex gap-2 ml-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleExecuteNow(job)}
                  disabled={executingJobId === job.id}
                  title="Ejecutar ahora"
                >
                  <ZapIcon className={`w-4 h-4 ${executingJobId === job.id ? "animate-spin" : ""}`} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleToggleActive(job)}
                  title={job.is_active ? "Pausar" : "Activar"}
                >
                  {job.is_active ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSelectedJob(job)
                    setExecutionsDialogOpen(true)
                  }}
                  title="Ver historial"
                >
                  <EyeIcon className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleEdit(job)} title="Editar">
                  <PencilIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(job)}
                  title="Eliminar"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2Icon className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {job.recent_executions && job.recent_executions.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Últimas 10 ejecuciones</h4>
                <div className="flex gap-1">
                  {job.recent_executions.map((exec) => (
                    <div
                      key={exec.id}
                      className={`w-8 h-8 rounded flex items-center justify-center text-xs ${
                        exec.status === "success"
                          ? "bg-green-100 text-green-800"
                          : exec.status === "failed"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                      title={`${exec.status} - ${exec.duration_ms ? `${exec.duration_ms}ms` : "En curso"} - ${new Date(exec.started_at).toLocaleString()}`}
                    >
                      {exec.status === "success" ? "✓" : exec.status === "failed" ? "✗" : "..."}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Dialog para ver historial completo */}
      <ExecutionsDialog job={selectedJob} open={executionsDialogOpen} onOpenChange={setExecutionsDialogOpen} />

      <Dialog
        open={editDialogOpen || createDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditDialogOpen(false)
            setCreateDialogOpen(false)
            setEditForm(null)
            setError(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editForm?.id ? "Editar Cron Job" : "Crear Nuevo Cron Job"}</DialogTitle>
            <DialogDescription>
              {editForm?.id ? "Modifica los parámetros del cron job" : "Crea una nueva tarea programada"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                value={editForm?.name || ""}
                onChange={(e) => setEditForm({ ...editForm!, name: e.target.value })}
                placeholder="Ej: Procesar Movimientos Aprobados"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={editForm?.description || ""}
                onChange={(e) => setEditForm({ ...editForm!, description: e.target.value })}
                placeholder="Descripción de la tarea"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Endpoint</label>
              <Input
                value={editForm?.endpoint || ""}
                onChange={(e) => setEditForm({ ...editForm!, endpoint: e.target.value })}
                placeholder="Ej: /api/cron/process-approved-movements"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Programación (CRON)</label>
              <Input
                value={editForm?.schedule || ""}
                onChange={(e) => setEditForm({ ...editForm!, schedule: e.target.value })}
                placeholder="Ej: 0 * * * * (cada hora)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formato: minuto hora día mes día_semana (0 = domingo)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={editForm?.is_active || false}
                onChange={(e) => setEditForm({ ...editForm!, is_active: e.target.checked })}
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Activo
              </label>
            </div>

            {error && <div className="p-3 bg-destructive/10 text-destructive rounded text-sm">{error}</div>}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false)
                  setCreateDialogOpen(false)
                  setEditForm(null)
                  setError(null)
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Cron Job</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar "{jobToDelete?.name}"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false)
                setJobToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ExecutionsDialog({
  job,
  open,
  onOpenChange,
}: {
  job: CronJob | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading } = useSWR<{ executions: any[] }>(
    job ? `/api/cron-jobs/${job.name}/executions` : null,
    fetcher,
  )

  if (!job) return null

  const executions = data?.executions || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de Ejecuciones: {job.name}</DialogTitle>
          <DialogDescription>Últimas 100 ejecuciones de esta tarea programada</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando historial...</div>
        ) : executions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No hay ejecuciones registradas</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((exec) => (
                <TableRow key={exec.id}>
                  <TableCell className="text-sm">{new Date(exec.started_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">
                    {exec.finished_at ? new Date(exec.finished_at).toLocaleString() : "En curso..."}
                  </TableCell>
                  <TableCell className="text-sm">{exec.duration_ms ? `${exec.duration_ms}ms` : "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        exec.status === "success" ? "default" : exec.status === "failed" ? "destructive" : "secondary"
                      }
                    >
                      {exec.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-md truncate">{exec.error_message || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
