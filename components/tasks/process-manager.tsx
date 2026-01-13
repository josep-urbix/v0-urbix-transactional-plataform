"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

interface Process {
  id: string
  nombre: string
  descripcion?: string
  titulo_template: string
  descripcion_template: string
  enum_value: string
  activa: boolean
}

const VALID_ENUM_VALUES = [
  "VINCULACION_WALLETS",
  "REVISION_KYC",
  "VERIFICACION_SALDOS",
  "AUDITORIA_TRANSACCIONES",
  "GESTION_USUARIOS",
  "SOPORTE_TECNICO",
  "OTRO",
]

export function ProcessManager() {
  const [processes, setProcesses] = useState<Process[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProcess, setEditingProcess] = useState<Process | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    titulo_template: "",
    descripcion_template: "",
    enum_value: "OTRO",
  })

  useEffect(() => {
    loadProcesses()
  }, [])

  async function loadProcesses() {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/tasks/processes")
      if (!response.ok) throw new Error("Failed to load processes")
      const data = await response.json()
      setProcesses(Array.isArray(data) ? data : [])
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los procesos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.nombre || !formData.titulo_template || !formData.descripcion_template || !formData.enum_value) {
      toast({
        title: "Error",
        description: "Completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    try {
      const method = editingProcess ? "PUT" : "POST"
      const url = editingProcess ? `/api/admin/tasks/processes/${editingProcess.id}` : "/api/admin/tasks/processes"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to save process")

      toast({
        title: "Éxito",
        description: `Proceso ${editingProcess ? "actualizado" : "creado"} correctamente`,
      })

      setIsDialogOpen(false)
      setEditingProcess(null)
      setFormData({
        nombre: "",
        descripcion: "",
        titulo_template: "",
        descripcion_template: "",
        enum_value: "OTRO",
      })
      loadProcesses()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el proceso",
        variant: "destructive",
      })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este proceso?")) return

    try {
      const response = await fetch(`/api/admin/tasks/processes/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete process")

      toast({
        title: "Éxito",
        description: "Proceso eliminado correctamente",
      })

      loadProcesses()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el proceso",
        variant: "destructive",
      })
    }
  }

  function openEditDialog(process: Process) {
    setEditingProcess(process)
    setFormData({
      nombre: process.nombre,
      descripcion: process.descripcion || "",
      titulo_template: process.titulo_template,
      descripcion_template: process.descripcion_template,
      enum_value: process.enum_value,
    })
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
    setEditingProcess(null)
    setFormData({
      nombre: "",
      descripcion: "",
      titulo_template: "",
      descripcion_template: "",
      enum_value: "OTRO",
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestión de Procesos</CardTitle>
            <CardDescription>Define los procesos que pueden tener las tareas</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingProcess(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Proceso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingProcess ? "Editar" : "Crear"} Proceso</DialogTitle>
                <DialogDescription>Define los detalles del proceso y su valor de enum</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="ej: KYC, Vinculación, etc."
                    disabled={!!editingProcess}
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción breve del proceso"
                  />
                </div>
                <div>
                  <Label htmlFor="enum_value">Valor de Enum *</Label>
                  <Select
                    value={formData.enum_value}
                    onValueChange={(value) => setFormData({ ...formData, enum_value: value })}
                  >
                    <SelectTrigger id="enum_value">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALID_ENUM_VALUES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="titulo_template">Plantilla de Título *</Label>
                  <Input
                    id="titulo_template"
                    value={formData.titulo_template}
                    onChange={(e) => setFormData({ ...formData, titulo_template: e.target.value })}
                    placeholder="ej: Verificación KYC de {{customer_id}}"
                  />
                </div>
                <div>
                  <Label htmlFor="descripcion_template">Plantilla de Descripción *</Label>
                  <Textarea
                    id="descripcion_template"
                    value={formData.descripcion_template}
                    onChange={(e) => setFormData({ ...formData, descripcion_template: e.target.value })}
                    placeholder="Descripción detallada del proceso"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit">{editingProcess ? "Actualizar" : "Crear"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Cargando procesos...</div>
        ) : processes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No hay procesos definidos</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Enum Value</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processes.map((process) => (
                <TableRow key={process.id}>
                  <TableCell className="font-medium">{process.nombre}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{process.enum_value}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{process.descripcion || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={process.activa ? "default" : "secondary"}>
                      {process.activa ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(process)} className="mr-2">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(process.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
