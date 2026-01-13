"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

interface TaskType {
  id: string
  codigo: string
  nombre: string
  descripcion: string
  activo: boolean
}

export function TaskTypesManager() {
  const [types, setTypes] = useState<TaskType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<TaskType | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    activo: true,
  })

  useEffect(() => {
    loadTypes()
  }, [])

  const loadTypes = async () => {
    try {
      const response = await fetch("/api/admin/tasks/types")
      if (!response.ok) throw new Error("Error al cargar tipos")
      const data = await response.json()
      setTypes(data)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los tipos de tareas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingType ? `/api/admin/tasks/types/${editingType.id}` : "/api/admin/tasks/types"

      const response = await fetch(url, {
        method: editingType ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Error al guardar tipo")

      toast({
        title: "Éxito",
        description: `Tipo de tarea ${editingType ? "actualizado" : "creado"} correctamente`,
      })

      setIsDialogOpen(false)
      setEditingType(null)
      resetForm()
      loadTypes()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar el tipo de tarea",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este tipo de tarea?")) return

    try {
      const response = await fetch(`/api/admin/tasks/types/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Error al eliminar")

      toast({
        title: "Éxito",
        description: "Tipo de tarea eliminado correctamente",
      })

      loadTypes()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el tipo de tarea",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (type: TaskType) => {
    setEditingType(type)
    setFormData({
      codigo: type.codigo,
      nombre: type.nombre,
      descripcion: type.descripcion,
      activo: type.activo,
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      codigo: "",
      nombre: "",
      descripcion: "",
      activo: true,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Cargando tipos de tareas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tipos de Tareas</h1>
          <p className="text-muted-foreground mt-2">Gestiona los tipos de tareas disponibles en el sistema</p>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingType(null)
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingType ? "Editar" : "Nuevo"} Tipo de Tarea</DialogTitle>
              <DialogDescription>Define un nuevo tipo de tarea para categorizar el trabajo</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                  placeholder="VINCULACION_PENDIENTE"
                  required
                  disabled={!!editingType}
                />
                <p className="text-xs text-muted-foreground">Código único en mayúsculas sin espacios</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Vinculación Pendiente"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción del tipo de tarea..."
                  rows={3}
                />
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
                  Tipo activo
                </Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingType ? "Actualizar" : "Crear"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipos Definidos</CardTitle>
          <CardDescription>{types.length} tipo(s) de tarea configurado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No hay tipos de tareas definidos
                  </TableCell>
                </TableRow>
              ) : (
                types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{type.codigo}</code>
                    </TableCell>
                    <TableCell className="font-medium">{type.nombre}</TableCell>
                    <TableCell className="max-w-md truncate">{type.descripcion}</TableCell>
                    <TableCell>
                      {type.activo ? (
                        <Badge variant="default">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(type)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(type.id)}>
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
