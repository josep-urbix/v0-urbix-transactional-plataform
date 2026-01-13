"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextEditor } from "@/components/documents/rich-text-editor"
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
import { Plus, FileText, Edit, Trash2, Send, Archive, Loader2, ArrowLeft, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface DocumentVersion {
  id: string
  document_type_id: string
  version_number: string
  status: "borrador" | "publicado" | "retirado"
  contenido_html: string
  variables_disponibles: string[]
  notas_version: string | null
  fecha_publicacion: string | null
  fecha_retiro: string | null
  created_at: string
  type_name: string
  type_display_name: string
  created_by_name: string | null
  published_by_name: string | null
  signed_count: number
}

interface DocumentType {
  id: string
  name: string
  display_name: string
}

const statusColors = {
  borrador: "bg-yellow-100 text-yellow-800",
  publicado: "bg-green-100 text-green-800",
  retirado: "bg-gray-100 text-gray-800",
}

const statusLabels = {
  borrador: "Borrador",
  publicado: "Publicado",
  retirado: "Retirado",
}

export function DocumentVersionsManager({ typeId }: { typeId: string }) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [documentType, setDocumentType] = useState<DocumentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isInvestorPreviewOpen, setIsInvestorPreviewOpen] = useState(false)
  const [previewEmail, setPreviewEmail] = useState("")
  const [previewHtml, setPreviewHtml] = useState("")
  const [previewLoading, setPreviewLoading] = useState(false)
  const [isPublishOpen, setIsPublishOpen] = useState(false)
  const [isRetireOpen, setIsRetireOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    version_number: "",
    contenido_html: "",
    variables_disponibles: "",
    notas_version: "",
  })

  useEffect(() => {
    fetchData()
  }, [typeId])

  async function fetchData() {
    try {
      const [typeRes, versionsRes] = await Promise.all([
        fetch(`/api/admin/documents/types/${typeId}`),
        fetch(`/api/admin/documents/versions?type_id=${typeId}`),
      ])

      if (typeRes.ok) {
        const typeData = await typeRes.json()
        setDocumentType(typeData.type)
      }

      if (versionsRes.ok) {
        const versionsData = await versionsRes.json()
        setVersions(versionsData.versions || [])
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los datos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      version_number: "",
      contenido_html: "",
      variables_disponibles: "",
      notas_version: "",
    })
  }

  function openEdit(version: DocumentVersion) {
    setSelectedVersion(version)
    setFormData({
      version_number: version.version_number,
      contenido_html: version.contenido_html,
      variables_disponibles: version.variables_disponibles?.join(", ") || "",
      notas_version: version.notas_version || "",
    })
    setIsEditOpen(true)
  }

  async function handleCreate() {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/documents/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type_id: typeId,
          version_number: formData.version_number,
          contenido_html: formData.contenido_html,
          variables_disponibles: formData.variables_disponibles
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          notas_version: formData.notas_version || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al crear")
      }

      toast({ title: "Versión creada", description: "La versión se creó correctamente en estado borrador" })
      setIsCreateOpen(false)
      resetForm()
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!selectedVersion) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/documents/versions/${selectedVersion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contenido_html: formData.contenido_html,
          variables_disponibles: formData.variables_disponibles
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          notas_version: formData.notas_version || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al actualizar")
      }

      toast({ title: "Versión actualizada", description: "Los cambios se guardaron correctamente" })
      setIsEditOpen(false)
      setSelectedVersion(null)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!selectedVersion) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/documents/versions/${selectedVersion.id}/publish`, {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al publicar")
      }

      toast({ title: "Versión publicada", description: "La versión está ahora disponible para firma" })
      setIsPublishOpen(false)
      setSelectedVersion(null)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleRetire() {
    if (!selectedVersion) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/documents/versions/${selectedVersion.id}/retire`, {
        method: "POST",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al retirar")
      }

      toast({ title: "Versión retirada", description: "La versión ya no está disponible para nuevas firmas" })
      setIsRetireOpen(false)
      setSelectedVersion(null)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedVersion) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/documents/versions/${selectedVersion.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al eliminar")
      }

      toast({ title: "Versión eliminada", description: "La versión se eliminó correctamente" })
      setIsDeleteOpen(false)
      setSelectedVersion(null)
      fetchData()
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleInvestorPreview() {
    if (!selectedVersion || !previewEmail) return
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/admin/documents/versions/${selectedVersion.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inversor_email: previewEmail }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al generar vista previa")
      }

      const data = await res.json()
      setPreviewHtml(data.preview_html)
      toast({
        title: "Vista previa generada",
        description: `Documento con datos de ${data.investor.nombre}`,
      })
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setPreviewLoading(false)
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/documents">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{documentType?.display_name || "Documento"}</h1>
          <p className="text-gray-500 font-mono text-sm">{documentType?.name}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Versiones</h2>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Versión
            </Button>
          </DialogTrigger>
          <DialogContent className="!max-w-[1400px] !sm:max-w-[1400px] w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nueva Versión</DialogTitle>
              <DialogDescription>La versión se creará en estado borrador hasta que la publiques</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version_number">Número de Versión</Label>
                  <Input
                    id="version_number"
                    value={formData.version_number}
                    onChange={(e) => setFormData({ ...formData, version_number: e.target.value })}
                    placeholder="1.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="variables">Variables (separadas por comas)</Label>
                  <Input
                    id="variables"
                    value={formData.variables_disponibles}
                    onChange={(e) => setFormData({ ...formData, variables_disponibles: e.target.value })}
                    placeholder="nombre_inversor, email_inversor, fecha_firma"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas de la Versión</Label>
                <Input
                  id="notas"
                  value={formData.notas_version}
                  onChange={(e) => setFormData({ ...formData, notas_version: e.target.value })}
                  placeholder="Cambios realizados en esta versión..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contenido">Contenido del Documento</Label>
                <RichTextEditor
                  value={formData.contenido_html}
                  onChange={(html) => setFormData({ ...formData, contenido_html: html })}
                  placeholder="Escribe el contenido del documento aquí..."
                />
                <p className="text-xs text-gray-500">
                  Usa el botón {"{{var}}"} para insertar variables. Ej: {"{{nombre_inversor}}"}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving || !formData.version_number || !formData.contenido_html}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Crear Borrador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {versions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">No hay versiones para este tipo de documento</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primera versión
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {versions.map((version) => (
            <Card key={version.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      Versión {version.version_number}
                      <Badge className={statusColors[version.status]}>{statusLabels[version.status]}</Badge>
                    </CardTitle>
                    <CardDescription>
                      Creada el {new Date(version.created_at).toLocaleDateString("es-ES")}
                      {version.created_by_name && ` por ${version.created_by_name}`}
                    </CardDescription>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">{version.signed_count}</span> firmas
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {version.notas_version && <p className="text-sm text-gray-600 mb-3">{version.notas_version}</p>}
                {version.variables_disponibles && version.variables_disponibles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {version.variables_disponibles.map((v) => (
                      <Badge key={v} variant="outline" className="font-mono text-xs">
                        {v}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {version.fecha_publicacion && (
                      <span>
                        Publicado: {new Date(version.fecha_publicacion).toLocaleDateString("es-ES")}
                        {version.published_by_name && ` por ${version.published_by_name}`}
                      </span>
                    )}
                    {version.fecha_retiro && (
                      <span className="ml-4">
                        Retirado: {new Date(version.fecha_retiro).toLocaleDateString("es-ES")}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVersion(version)
                        setIsPreviewOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Vista Previa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedVersion(version)
                        setPreviewEmail("")
                        setPreviewHtml("")
                        setIsInvestorPreviewOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Vista con Inversor
                    </Button>
                    {version.status === "borrador" && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openEdit(version)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 bg-transparent"
                          onClick={() => {
                            setSelectedVersion(version)
                            setIsPublishOpen(true)
                          }}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Publicar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 bg-transparent"
                          onClick={() => {
                            setSelectedVersion(version)
                            setIsDeleteOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {version.status === "publicado" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700 bg-transparent"
                        onClick={() => {
                          setSelectedVersion(version)
                          setIsRetireOpen(true)
                        }}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Retirar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="!max-w-[1400px] !sm:max-w-[1400px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa - Versión {selectedVersion?.version_number}</DialogTitle>
          </DialogHeader>
          <div
            className="border rounded-lg p-6 bg-white prose max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedVersion?.contenido_html || "" }}
          />
        </DialogContent>
      </Dialog>

      {/* Investor Preview Dialog */}
      <Dialog open={isInvestorPreviewOpen} onOpenChange={setIsInvestorPreviewOpen}>
        <DialogContent className="!max-w-[1400px] !sm:max-w-[1400px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa con Datos de Inversor - Versión {selectedVersion?.version_number}</DialogTitle>
            <DialogDescription>
              Introduce el email de un inversor para ver el documento con sus datos reales
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="email@inversor.com"
                value={previewEmail}
                onChange={(e) => setPreviewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && previewEmail) {
                    handleInvestorPreview()
                  }
                }}
              />
              <Button onClick={handleInvestorPreview} disabled={!previewEmail || previewLoading}>
                {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generar"}
              </Button>
            </div>
            {previewHtml && (
              <div
                className="border rounded-lg p-6 bg-white prose max-w-none"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="!max-w-[1400px] !sm:max-w-[1400px] w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Versión {selectedVersion?.version_number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_variables">Variables (separadas por comas)</Label>
              <Input
                id="edit_variables"
                value={formData.variables_disponibles}
                onChange={(e) => setFormData({ ...formData, variables_disponibles: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_notas">Notas de la Versión</Label>
              <Input
                id="edit_notas"
                value={formData.notas_version}
                onChange={(e) => setFormData({ ...formData, notas_version: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_contenido">Contenido del Documento</Label>
              <RichTextEditor
                value={formData.contenido_html}
                onChange={(html) => setFormData({ ...formData, contenido_html: html })}
                placeholder="Escribe el contenido del documento aquí..."
              />
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

      {/* Publish Confirmation */}
      <AlertDialog open={isPublishOpen} onOpenChange={setIsPublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Publicar versión {selectedVersion?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Una vez publicada, la versión no podrá ser editada. Las versiones anteriores serán retiradas
              automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} className="bg-green-600 hover:bg-green-700">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retire Confirmation */}
      <AlertDialog open={isRetireOpen} onOpenChange={setIsRetireOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Retirar versión {selectedVersion?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              La versión dejará de estar disponible para nuevas firmas. Los documentos ya firmados no se verán
              afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetire} className="bg-orange-600 hover:bg-orange-700">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Retirar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar versión {selectedVersion?.version_number}?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
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
