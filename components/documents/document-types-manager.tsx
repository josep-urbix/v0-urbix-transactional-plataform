"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { Plus, FileText, Edit, Trash2, Eye, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface DocumentType {
  id: string
  name: string
  display_name: string
  description: string | null
  requiere_firma: boolean
  obligatorio_antes_de_invertir: boolean
  aplica_a_proyecto: boolean
  dias_validez: number | null
  orden: number
  activo: boolean
  created_at: string
  created_by_name: string | null
  total_versions: number
  published_versions: number
}

export function DocumentTypesManager() {
  const [types, setTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
    requiere_firma: true,
    obligatorio_antes_de_invertir: false,
    aplica_a_proyecto: false,
    dias_validez: "",
    orden: "0",
  })

  useEffect(() => {
    fetchTypes()
  }, [])

  async function fetchTypes() {
    try {
      const res = await fetch("/api/admin/documents/types")
      if (!res.ok) throw new Error("Error al cargar tipos")
      const data = await res.json()
      setTypes(data.types || [])
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los tipos de documentos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      display_name: "",
      description: "",
      requiere_firma: true,
      obligatorio_antes_de_invertir: false,
      aplica_a_proyecto: false,
      dias_validez: "",
      orden: "0",
    })
  }

  function openEdit(type: DocumentType) {
    setSelectedType(type)
    setFormData({
      name: type.name,
      display_name: type.display_name,
      description: type.description || "",
      requiere_firma: type.requiere_firma,
      obligatorio_antes_de_invertir: type.obligatorio_antes_de_invertir,
      aplica_a_proyecto: type.aplica_a_proyecto,
      dias_validez: type.dias_validez?.toString() || "",
      orden: type.orden.toString(),
    })
    setIsEditOpen(true)
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/documents/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          dias_validez: formData.dias_validez ? Number.parseInt(formData.dias_validez) : null,
          orden: Number.parseInt(formData.orden),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al crear")
      }

      toast({ title: "Tipo creado", description: "El tipo de documento se creó correctamente" })
      setIsCreateOpen(false)
      resetForm()
      fetchTypes()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!selectedType) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/documents/types/${selectedType.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: formData.display_name,
          description: formData.description || null,
          requiere_firma: formData.requiere_firma,
          obligatorio_antes_de_invertir: formData.obligatorio_antes_de_invertir,
          aplica_a_proyecto: formData.aplica_a_proyecto,
          dias_validez: formData.dias_validez ? Number.parseInt(formData.dias_validez) : null,
          orden: Number.parseInt(formData.orden),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al actualizar")
      }

      toast({ title: "Tipo actualizado", description: "El tipo de documento se actualizó correctamente" })
      setIsEditOpen(false)
      setSelectedType(null)
      fetchTypes()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedType) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/documents/types/${selectedType.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al eliminar")
      }

      toast({ title: "Tipo eliminado", description: "El tipo de documento se eliminó correctamente" })
      setIsDeleteOpen(false)
      setSelectedType(null)
      fetchTypes()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(type: DocumentType) {
    try {
      await fetch(`/api/admin/documents/types/${type.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !type.activo }),
      })
      fetchTypes()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tipos de Documentos</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Tipo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Tipo de Documento</DialogTitle>
              <DialogDescription>Define un nuevo tipo de documento para el portal de inversores</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Código (snake_case)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s/g, "_") })
                    }
                    placeholder="contrato_inversion"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Nombre Visible</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="Contrato de Inversión"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del tipo de documento..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dias_validez">Días de Validez</Label>
                  <Input
                    id="dias_validez"
                    type="number"
                    value={formData.dias_validez}
                    onChange={(e) => setFormData({ ...formData, dias_validez: e.target.value })}
                    placeholder="Sin caducidad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orden">Orden</Label>
                  <Input
                    id="orden"
                    type="number"
                    value={formData.orden}
                    onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="requiere_firma">Requiere firma del inversor</Label>
                  <Switch
                    id="requiere_firma"
                    checked={formData.requiere_firma}
                    onCheckedChange={(c) => setFormData({ ...formData, requiere_firma: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="obligatorio">Obligatorio antes de invertir</Label>
                  <Switch
                    id="obligatorio"
                    checked={formData.obligatorio_antes_de_invertir}
                    onCheckedChange={(c) => setFormData({ ...formData, obligatorio_antes_de_invertir: c })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="aplica_proyecto">Aplica a proyecto específico</Label>
                  <Switch
                    id="aplica_proyecto"
                    checked={formData.aplica_a_proyecto}
                    onCheckedChange={(c) => setFormData({ ...formData, aplica_a_proyecto: c })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving || !formData.name || !formData.display_name}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {types.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No hay tipos de documentos configurados</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer tipo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {types.map((type) => (
            <Card key={type.id} className={!type.activo ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      {type.display_name}
                      {!type.activo && <Badge variant="secondary">Inactivo</Badge>}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs">{type.name}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={type.activo} onCheckedChange={() => toggleActive(type)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {type.description && <p className="text-sm text-gray-600 mb-4">{type.description}</p>}
                <div className="flex flex-wrap gap-2 mb-4">
                  {type.requiere_firma && <Badge variant="outline">Requiere firma</Badge>}
                  {type.obligatorio_antes_de_invertir && <Badge variant="destructive">Obligatorio</Badge>}
                  {type.aplica_a_proyecto && <Badge variant="secondary">Por proyecto</Badge>}
                  {type.dias_validez && <Badge variant="outline">Válido {type.dias_validez} días</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{type.total_versions}</span> versiones (
                    <span className="text-green-600">{type.published_versions}</span> publicadas)
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/documents/versions/${type.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        Versiones
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(type)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 bg-transparent"
                      onClick={() => {
                        setSelectedType(type)
                        setIsDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Tipo de Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input value={formData.name} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">Nombre Visible</Label>
              <Input
                id="edit_display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Descripción</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_dias_validez">Días de Validez</Label>
                <Input
                  id="edit_dias_validez"
                  type="number"
                  value={formData.dias_validez}
                  onChange={(e) => setFormData({ ...formData, dias_validez: e.target.value })}
                  placeholder="Sin caducidad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_orden">Orden</Label>
                <Input
                  id="edit_orden"
                  type="number"
                  value={formData.orden}
                  onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Requiere firma del inversor</Label>
                <Switch
                  checked={formData.requiere_firma}
                  onCheckedChange={(c) => setFormData({ ...formData, requiere_firma: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Obligatorio antes de invertir</Label>
                <Switch
                  checked={formData.obligatorio_antes_de_invertir}
                  onCheckedChange={(c) => setFormData({ ...formData, obligatorio_antes_de_invertir: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Aplica a proyecto específico</Label>
                <Switch
                  checked={formData.aplica_a_proyecto}
                  onCheckedChange={(c) => setFormData({ ...formData, aplica_a_proyecto: c })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todas las versiones asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
