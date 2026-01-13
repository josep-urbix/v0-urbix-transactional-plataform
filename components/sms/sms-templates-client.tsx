"use client"

import type React from "react"

import { useState } from "react"
import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Plus, Edit, Eye } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SMSTemplatesClient() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/sms/templates", fetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [formData, setFormData] = useState({
    key: "",
    name: "",
    description: "",
    category: "auth",
    body: "",
    sender: "",
    is_active: true,
  })
  const [previewBody, setPreviewBody] = useState("")

  const sampleVars: Record<string, string> = {
    code: "123456",
    minutes: "5",
    userName: "Juan",
    appName: "Urbix",
    documentName: "Contrato de Inversión",
  }

  const generatePreview = (body: string) => {
    let preview = body
    Object.entries(sampleVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g")
      preview = preview.replace(regex, value)
    })
    return preview
  }

  const handleBodyChange = (body: string) => {
    setFormData({ ...formData, body })
    setPreviewBody(generatePreview(body))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const variables = [
      { name: "code", type: "string", required: true },
      { name: "minutes", type: "number", required: true },
    ]

    try {
      if (editingTemplate) {
        await fetch(`/api/admin/sms/templates/${editingTemplate.key}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, variables }),
        })
      } else {
        await fetch("/api/admin/sms/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...formData, variables }),
        })
      }

      mutate()
      setDialogOpen(false)
      setEditingTemplate(null)
      setFormData({
        key: "",
        name: "",
        description: "",
        category: "auth",
        body: "",
        sender: "",
        is_active: true,
      })
    } catch (error) {
      console.error("Error saving template:", error)
    }
  }

  const handleEdit = (template: any) => {
    setEditingTemplate(template)
    setFormData({
      key: template.key,
      name: template.name,
      description: template.description || "",
      category: template.category,
      body: template.body,
      sender: template.sender || "",
      is_active: template.is_active,
    })
    setPreviewBody(generatePreview(template.body))
    setDialogOpen(true)
  }

  if (isLoading) {
    return <div className="text-[#777777]">Cargando plantillas...</div>
  }

  if (error) {
    return <div className="text-red-600">Error al cargar plantillas: {error.message}</div>
  }

  const templates = data?.templates || []

  const getSegmentCount = (text: string) => {
    const length = text.length
    if (length <= 160) return 1
    if (length <= 320) return 2
    if (length <= 480) return 3
    return Math.ceil(length / 153)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#164AA6] hover:bg-[#164AA6]/90">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? "Editar Plantilla" : "Nueva Plantilla SMS"}</DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? "Modifica los campos de la plantilla existente"
                  : "Crea una nueva plantilla de SMS con variables personalizables"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="key">Key (identificador único)</Label>
                  <Input
                    id="key"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                    disabled={!!editingTemplate}
                    placeholder="auth.otp.login"
                    className="font-mono"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="OTP Login"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Código OTP para inicio de sesión"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="auth"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sender">Remitente (opcional)</Label>
                  <Input
                    id="sender"
                    value={formData.sender}
                    onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                    placeholder="Urbix"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="body">Contenido del SMS</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  placeholder="Tu código de acceso es {{code}} y caduca en {{minutes}} minutos."
                  rows={4}
                  className="font-mono"
                  required
                />
                <p className="text-xs text-[#777777] mt-1">
                  Variables disponibles: {"{{code}}, {{minutes}}, {{userName}}, {{appName}}, {{documentName}}"}
                </p>
              </div>

              {/* Live Preview */}
              {formData.body && (
                <Card className="p-4 bg-[#F2F2F2] border-[#E6E6E6]">
                  <Label className="text-sm font-semibold text-[#164AA6]">
                    <Eye className="h-4 w-4 inline mr-1" />
                    Vista Previa
                  </Label>
                  <p className="mt-2 text-[#164AA6] whitespace-pre-wrap">{previewBody}</p>
                  <div className="mt-3 flex gap-4 text-xs text-[#777777]">
                    <span>Caracteres: {previewBody.length}</span>
                    <span>Segmentos: {getSegmentCount(previewBody)}</span>
                  </div>
                </Card>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Plantilla activa
                </Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#164AA6] hover:bg-[#164AA6]/90">
                  {editingTemplate ? "Actualizar" : "Crear"} Plantilla
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white border-[#E6E6E6]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E6E6E6]">
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Key</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Nombre</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Categoría</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Activa</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Actualizada</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#777777]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template: any) => (
                <tr key={template.id} className="border-b border-[#E6E6E6] hover:bg-[#F2F2F2]">
                  <td className="py-3 px-4 text-sm font-mono text-[#164AA6]">{template.key}</td>
                  <td className="py-3 px-4 text-sm text-[#777777]">{template.name}</td>
                  <td className="py-3 px-4 text-sm text-[#777777]">{template.category}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        template.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {template.is_active ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-[#777777]">
                    {new Date(template.updated_at).toLocaleString("es-ES")}
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      className="text-[#164AA6] hover:text-[#164AA6] hover:bg-[#164AA6]/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
