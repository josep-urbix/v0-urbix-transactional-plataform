"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Search, Zap, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { WorkflowEvent } from "@/lib/types/workflow"

export function WorkflowEventsManager() {
  const [events, setEvents] = useState<WorkflowEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<WorkflowEvent | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    payload_schema: "{}",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [])

  async function fetchEvents() {
    setLoading(true)
    try {
      const response = await fetch("/api/workflows/events")
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error("Error fetching events:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    setSaving(true)
    try {
      let payloadSchema = null
      if (formData.payload_schema && formData.payload_schema !== "{}") {
        payloadSchema = JSON.parse(formData.payload_schema)
      }

      const response = await fetch("/api/workflows/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          payload_schema: payloadSchema,
        }),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData({ name: "", description: "", payload_schema: "{}" })
        fetchEvents()
      } else {
        const error = await response.json()
        alert(error.error || "Error creando evento")
      }
    } catch (error) {
      console.error("Error creating event:", error)
      alert("Error creando evento")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!selectedEvent) return

    setSaving(true)
    try {
      let payloadSchema = null
      if (formData.payload_schema && formData.payload_schema !== "{}") {
        payloadSchema = JSON.parse(formData.payload_schema)
      }

      const response = await fetch(`/api/workflows/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          payload_schema: payloadSchema,
        }),
      })

      if (response.ok) {
        setShowEditDialog(false)
        setSelectedEvent(null)
        fetchEvents()
      } else {
        const error = await response.json()
        alert(error.error || "Error actualizando evento")
      }
    } catch (error) {
      console.error("Error updating event:", error)
      alert("Error actualizando evento")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedEvent) return

    try {
      const response = await fetch(`/api/workflows/events/${selectedEvent.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setShowDeleteDialog(false)
        setSelectedEvent(null)
        fetchEvents()
      } else {
        const error = await response.json()
        alert(error.error || "Error eliminando evento")
      }
    } catch (error) {
      console.error("Error deleting event:", error)
    }
  }

  function openEditDialog(event: WorkflowEvent) {
    setSelectedEvent(event)
    setFormData({
      name: event.name,
      description: event.description || "",
      payload_schema: event.payload_schema ? JSON.stringify(event.payload_schema, null, 2) : "{}",
    })
    setShowEditDialog(true)
  }

  function openDeleteDialog(event: WorkflowEvent) {
    setSelectedEvent(event)
    setShowDeleteDialog(true)
  }

  const filteredEvents = events.filter(
    (event) =>
      event.name.toLowerCase().includes(search.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Con Workflows Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.filter((e) => (e.active_workflow_count || 0) > 0).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sin Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter((e) => (e.active_workflow_count || 0) === 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchEvents} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            onClick={() => {
              setFormData({ name: "", description: "", payload_schema: "{}" })
              setShowCreateDialog(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Evento
          </Button>
        </div>
      </div>

      {/* Events Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-center">Workflows Activos</TableHead>
              <TableHead>Creado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Cargando eventos...
                </TableCell>
              </TableRow>
            ) : filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No se encontraron eventos
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="font-mono text-sm">{event.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{event.description || "-"}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={event.active_workflow_count && event.active_workflow_count > 0 ? "default" : "secondary"}
                    >
                      {event.active_workflow_count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(event.created_at).toLocaleDateString("es-ES")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(event)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => openDeleteDialog(event)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Evento</DialogTitle>
            <DialogDescription>Crea un nuevo evento que podrá disparar workflows</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder="ej: USER_CREATED, PAYMENT_RECEIVED"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })
                }
              />
              <p className="text-xs text-muted-foreground">Solo mayúsculas, números y guiones bajos</p>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                placeholder="Descripción del evento"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payload Schema (JSON)</Label>
              <Textarea
                placeholder="{}"
                value={formData.payload_schema}
                onChange={(e) => setFormData({ ...formData, payload_schema: e.target.value })}
                className="font-mono text-sm min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || saving}>
              {saving ? "Creando..." : "Crear Evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Evento</DialogTitle>
            <DialogDescription>Modifica la configuración del evento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Payload Schema (JSON)</Label>
              <Textarea
                value={formData.payload_schema}
                onChange={(e) => setFormData({ ...formData, payload_schema: e.target.value })}
                className="font-mono text-sm min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name || saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el evento &quot;{selectedEvent?.name}&quot;. Los workflows que lo usen dejarán de
              funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
