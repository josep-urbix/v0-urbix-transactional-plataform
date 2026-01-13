"use client"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, Eye, Send, Copy, Code } from "lucide-react"
import { HtmlEditor } from "@/components/html-editor"
import type { EmailTemplate } from "@/lib/types/email"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function EmailTemplatesManager() {
  const { data, mutate, isLoading } = useSWR<{ templates: EmailTemplate[] }>("/api/emails/templates", fetcher)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isTestOpen, setIsTestOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    description: "",
    from_email: "",
    from_name: "",
    reply_to: "",
    subject: "",
    body_html: "",
    body_text: "",
    variables: [] as string[],
    is_active: true,
  })

  const resetForm = () => {
    setFormData({
      slug: "",
      name: "",
      description: "",
      from_email: "",
      from_name: "",
      reply_to: "",
      subject: "",
      body_html: "",
      body_text: "",
      variables: [],
      is_active: true,
    })
  }

  const openCreate = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const openEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      slug: template.slug,
      name: template.name,
      description: template.description || "",
      from_email: template.from_email,
      from_name: template.from_name || "",
      reply_to: template.reply_to || "",
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || "",
      variables: template.variables || [],
      is_active: template.is_active,
    })
    setIsEditOpen(true)
  }

  const openPreview = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setIsPreviewOpen(true)
  }

  const openDelete = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setIsDeleteOpen(true)
  }

  const openTest = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    setTestEmail("")
    setTestResult(null)
    setIsTestOpen(true)
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/emails/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al crear template")
      }

      await mutate()
      setIsCreateOpen(false)
      resetForm()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al crear template")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedTemplate) return
    setSaving(true)
    try {
      const res = await fetch(`/api/emails/templates/${selectedTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al actualizar template")
      }

      await mutate()
      setIsEditOpen(false)
      setSelectedTemplate(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al actualizar template")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTemplate) return
    try {
      const res = await fetch(`/api/emails/templates/${selectedTemplate.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al eliminar template")
      }

      await mutate()
      setIsDeleteOpen(false)
      setSelectedTemplate(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al eliminar template")
    }
  }

  const handleTest = async () => {
    if (!selectedTemplate || !testEmail) return
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/emails/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          templateSlug: selectedTemplate.slug,
        }),
      })

      const result = await res.json()

      if (result.success) {
        setTestResult({ success: true, message: "Email de prueba enviado correctamente" })
      } else {
        setTestResult({ success: false, message: result.error || "Error al enviar" })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Error al enviar email de prueba",
      })
    } finally {
      setTestSending(false)
    }
  }

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g) || []
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))]
  }

  const updateVariables = () => {
    const allText = `${formData.subject} ${formData.body_html} ${formData.body_text}`
    const vars = extractVariables(allText)
    setFormData((prev) => ({ ...prev, variables: vars }))
  }

  const copySlug = (slug: string) => {
    navigator.clipboard.writeText(slug)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Cargando templates...</div>
        </CardContent>
      </Card>
    )
  }

  const templates = data?.templates || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plantillas de Email</h1>
          <p className="text-muted-foreground">Gestiona las plantillas de emails transaccionales</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Templates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Remitente</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay plantillas de email
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">{template.slug}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copySlug(template.slug)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{template.from_name || template.from_email}</div>
                        <div className="text-muted-foreground">{template.from_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {template.variables?.slice(0, 3).map((v) => (
                          <Badge key={v} variant="outline" className="text-xs">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                        {template.variables?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.variables.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openPreview(template)} title="Vista previa">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openTest(template)} title="Enviar prueba">
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(template)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(template)} title="Eliminar">
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

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || isEditOpen}
        onOpenChange={() => (isCreateOpen ? setIsCreateOpen(false) : setIsEditOpen(false))}
      >
        <DialogContent className="max-w-[95vw] w-full lg:max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreateOpen ? "Nueva Plantilla" : "Editar Plantilla"}</DialogTitle>
            <DialogDescription>
              {isCreateOpen ? "Crea una nueva plantilla de email" : "Modifica la plantilla de email"}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="content">Contenido</TabsTrigger>
              <TabsTrigger value="preview">Vista Previa</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (identificador único)</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))
                    }
                    placeholder="welcome-email"
                    disabled={isEditOpen}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Email de bienvenida"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del propósito del email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="from_email">Email remitente</Label>
                  <Input
                    id="from_email"
                    type="email"
                    value={formData.from_email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, from_email: e.target.value }))}
                    placeholder="noreply@urbix.es"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from_name">Nombre remitente</Label>
                  <Input
                    id="from_name"
                    value={formData.from_name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, from_name: e.target.value }))}
                    placeholder="Urbix"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reply_to">Reply-To (opcional)</Label>
                  <Input
                    id="reply_to"
                    type="email"
                    value={formData.reply_to}
                    onChange={(e) => setFormData((prev) => ({ ...prev, reply_to: e.target.value }))}
                    placeholder="soporte@urbix.es"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Plantilla activa</Label>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Asunto</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  onBlur={updateVariables}
                  placeholder="Bienvenido {{user_name}}"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Contenido HTML</Label>
                  <Button variant="outline" size="sm" onClick={updateVariables}>
                    <Code className="mr-2 h-3 w-3" />
                    Detectar variables
                  </Button>
                </div>
                <HtmlEditor
                  value={formData.body_html}
                  onChange={(html) => setFormData((prev) => ({ ...prev, body_html: html }))}
                  placeholder="Escribe el contenido del email aquí..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_text">Contenido texto plano (opcional)</Label>
                <Textarea
                  id="body_text"
                  value={formData.body_text}
                  onChange={(e) => setFormData((prev) => ({ ...prev, body_text: e.target.value }))}
                  onBlur={updateVariables}
                  placeholder="Hola {{user_name}}"
                  className="min-h-[150px]"
                />
              </div>

              {formData.variables.length > 0 && (
                <div className="space-y-2">
                  <Label>Variables detectadas</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map((v) => (
                      <Badge key={v} variant="secondary">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    De: {formData.from_name || formData.from_email} &lt;{formData.from_email}&gt;
                  </CardTitle>
                  <CardDescription>Asunto: {formData.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="border rounded-lg p-4 bg-white min-h-[400px]"
                    dangerouslySetInnerHTML={{ __html: formData.body_html }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => (isCreateOpen ? setIsCreateOpen(false) : setIsEditOpen(false))}>
              Cancelar
            </Button>
            <Button onClick={isCreateOpen ? handleCreate : handleUpdate} disabled={saving}>
              {saving ? "Guardando..." : isCreateOpen ? "Crear Plantilla" : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              De: {selectedTemplate?.from_name || selectedTemplate?.from_email} &lt;{selectedTemplate?.from_email}&gt;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Asunto:</Label>
              <p className="font-medium">{selectedTemplate?.subject}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Contenido:</Label>
              <div
                className="border rounded-lg p-4 bg-white mt-2"
                dangerouslySetInnerHTML={{ __html: selectedTemplate?.body_html || "" }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar email de prueba</DialogTitle>
            <DialogDescription>
              Envía un email de prueba usando la plantilla "{selectedTemplate?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test_email">Email de destino</Label>
              <Input
                id="test_email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
            {testResult && (
              <div
                className={`p-3 rounded-lg ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
              >
                {testResult.message}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTest} disabled={testSending || !testEmail}>
              {testSending ? "Enviando..." : "Enviar prueba"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la plantilla "{selectedTemplate?.name}". Si hay emails enviados con esta plantilla,
              solo se desactivará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
