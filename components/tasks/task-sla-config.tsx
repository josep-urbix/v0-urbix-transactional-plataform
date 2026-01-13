"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Plus, Pencil, Trash2 } from "lucide-react"

interface SLAConfig {
  id: string
  prioridad: "BAJA" | "MEDIA" | "ALTA" | "CRITICA"
  tipo_tarea?: string
  horas_para_asignacion: number
  horas_para_resolucion: number
  escalar_a_supervisor: boolean
  notificar_vencimiento: boolean
  activo: boolean
}

export function TaskSLAConfig() {
  const [configs, setConfigs] = useState<SLAConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<SLAConfig | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    prioridad: "MEDIA" as const,
    tipo_tarea: "",
    horas_para_asignacion: 24,
    horas_para_resolucion: 72,
    escalar_a_supervisor: false,
    notificar_vencimiento: true,
    activo: true,
  })

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const response = await fetch("/api/admin/tasks/sla-config")
      if (!response.ok) throw new Error("Error al cargar configuraciones")
      const data = await response.json()
      setConfigs(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las configuraciones SLA",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingConfig ? `/api/admin/tasks/sla-config/${editingConfig.id}` : "/api/admin/tasks/sla-config"

      const response = await fetch(url, {
        method: editingConfig ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Error al guardar configuración")

      toast({
        title: "Éxito",
        description: `Configuración ${editingConfig ? "actualizada" : "creada"} correctamente`,
      })

      setIsDialogOpen(false)
      setEditingConfig(null)
      resetForm()
      loadConfigs()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta configuración?")) return

    try {
      const response = await fetch(`/api/admin/tasks/sla-config/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Error al eliminar")

      toast({
        title: "Éxito",
        description: "Configuración eliminada correctamente",
      })

      loadConfigs()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la configuración",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (config: SLAConfig) => {
    setEditingConfig(config)
    setFormData({
      prioridad: config.prioridad,
      tipo_tarea: config.tipo_tarea || "",
      horas_para_asignacion: config.horas_para_asignacion,
      horas_para_resolucion: config.horas_para_resolucion,
      escalar_a_supervisor: config.escalar_a_supervisor,
      notificar_vencimiento: config.notificar_vencimiento,
      activo: config.activo,
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      prioridad: "MEDIA",
      tipo_tarea: "",
      horas_para_asignacion: 24,
      horas_para_resolucion: 72,
      escalar_a_supervisor: false,
      notificar_vencimiento: true,
      activo: true,
    })
  }

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case "CRITICA":
        return "destructive"
      case "ALTA":
        return "default"
      case "MEDIA":
        return "secondary"
      case "BAJA":
        return "outline"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Cargando configuraciones...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuración SLA</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona los tiempos de respuesta y escalado automático de tareas
          </p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingConfig(null)
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Configuración
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingConfig ? "Editar" : "Nueva"} Configuración SLA</DialogTitle>
              <DialogDescription>Define los tiempos de respuesta y acciones automáticas para tareas</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prioridad">Prioridad *</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value: any) => setFormData({ ...formData, prioridad: value })}
                  >
                    <SelectTrigger id="prioridad">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAJA">Baja</SelectItem>
                      <SelectItem value="MEDIA">Media</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                      <SelectItem value="CRITICA">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_tarea">Tipo de Tarea (Opcional)</Label>
                  <Input
                    id="tipo_tarea"
                    value={formData.tipo_tarea}
                    onChange={(e) => setFormData({ ...formData, tipo_tarea: e.target.value })}
                    placeholder="Dejar vacío para aplicar a todos"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horas_asignacion">Horas para Asignación *</Label>
                  <Input
                    id="horas_asignacion"
                    type="number"
                    min="1"
                    value={formData.horas_para_asignacion}
                    onChange={(e) =>
                      setFormData({ ...formData, horas_para_asignacion: Number.parseInt(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="horas_resolucion">Horas para Resolución *</Label>
                  <Input
                    id="horas_resolucion"
                    type="number"
                    min="1"
                    value={formData.horas_para_resolucion}
                    onChange={(e) =>
                      setFormData({ ...formData, horas_para_resolucion: Number.parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="escalar"
                    checked={formData.escalar_a_supervisor}
                    onChange={(e) => setFormData({ ...formData, escalar_a_supervisor: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="escalar" className="cursor-pointer">
                    Escalar a supervisor automáticamente
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notificar"
                    checked={formData.notificar_vencimiento}
                    onChange={(e) => setFormData({ ...formData, notificar_vencimiento: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="notificar" className="cursor-pointer">
                    Notificar vencimiento por email
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="activo" className="cursor-pointer">
                    Configuración activa
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingConfig ? "Actualizar" : "Crear"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuraciones SLA Activas</CardTitle>
          <CardDescription>{configs.length} configuración(es) definida(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prioridad</TableHead>
                <TableHead>Tipo de Tarea</TableHead>
                <TableHead>Hrs Asignación</TableHead>
                <TableHead>Hrs Resolución</TableHead>
                <TableHead>Escalado</TableHead>
                <TableHead>Notificación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No hay configuraciones definidas
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <Badge variant={getPriorityColor(config.prioridad)}>{config.prioridad}</Badge>
                    </TableCell>
                    <TableCell>{config.tipo_tarea || "Todas"}</TableCell>
                    <TableCell>{config.horas_para_asignacion}h</TableCell>
                    <TableCell>{config.horas_para_resolucion}h</TableCell>
                    <TableCell>
                      {config.escalar_a_supervisor ? (
                        <Badge variant="default">Sí</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {config.notificar_vencimiento ? (
                        <Badge variant="default">Sí</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {config.activo ? (
                        <Badge variant="default">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(config)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(config.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
