"use client"

import type React from "react"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, Save, Send, CheckCircle, XCircle, Loader2 } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function SMSApiConfigClient() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/sms/config", fetcher)
  const { data: templatesData } = useSWR("/api/admin/sms/templates", fetcher)
  const [showToken, setShowToken] = useState(false)
  const [formData, setFormData] = useState({
    provider_name: "smsapi",
    base_url: "https://api.smsapi.com",
    auth_type: "bearer_token",
    access_token: "",
    default_sender: "Urbix",
    test_mode: false,
    webhook_url: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testData, setTestData] = useState({
    phone_number: "",
    template_key: "",
    variables: {} as Record<string, string>,
  })
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null)

  useEffect(() => {
    if (data?.config) {
      setFormData({
        provider_name: data.config.provider_name,
        base_url: data.config.base_url,
        auth_type: data.config.auth_type,
        access_token: data.config.access_token,
        default_sender: data.config.default_sender || "",
        test_mode: data.config.test_mode,
        webhook_url: data.config.webhook_url || "",
      })
    }
  }, [data])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const response = await fetch("/api/admin/sms/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        mutate()
        alert("Configuración guardada correctamente")
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error saving config:", error)
      alert("Error al guardar la configuración")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTestSMS = async () => {
    if (!testData.phone_number) {
      alert("Introduce un número de teléfono")
      return
    }

    setIsSendingTest(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/admin/sms/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testData),
      })

      const result = await response.json()

      if (response.ok) {
        setTestResult({
          success: true,
          message: result.simulated ? "SMS simulado correctamente (modo test)" : "SMS enviado correctamente",
          details: result.details,
        })
      } else {
        setTestResult({
          success: false,
          message: result.error || "Error al enviar SMS",
        })
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || "Error de conexión",
      })
    } finally {
      setIsSendingTest(false)
    }
  }

  if (isLoading) {
    return <div className="text-[#777777]">Cargando configuración...</div>
  }

  if (error) {
    return <div className="text-red-600">Error al cargar configuración: {error.message}</div>
  }

  const templates = templatesData?.templates || []

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white border-[#E6E6E6]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="provider_name">Proveedor</Label>
            <Input
              id="provider_name"
              value={formData.provider_name}
              onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
              placeholder="smsapi"
              required
            />
            <p className="text-xs text-[#777777] mt-1">Nombre del proveedor de SMS (ej: smsapi, twilio, etc.)</p>
          </div>

          <div>
            <Label htmlFor="base_url">URL Base de la API</Label>
            <Input
              id="base_url"
              type="url"
              value={formData.base_url}
              onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              placeholder="https://api.smsapi.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="auth_type">Tipo de Autenticación</Label>
            <Input
              id="auth_type"
              value={formData.auth_type}
              onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
              placeholder="bearer_token"
              required
            />
            <p className="text-xs text-[#777777] mt-1">Tipo de autenticación (ej: bearer_token, api_key, oauth)</p>
          </div>

          <div>
            <Label htmlFor="access_token">Access Token / API Key</Label>
            <div className="relative">
              <Input
                id="access_token"
                type={showToken ? "text" : "password"}
                value={formData.access_token}
                onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                placeholder={data?.config ? "********" : "Introduce tu token de acceso"}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#777777] hover:text-[#164AA6]"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-[#777777] mt-1">Token de acceso del proveedor SMS</p>
          </div>

          <div>
            <Label htmlFor="default_sender">Remitente por Defecto</Label>
            <Input
              id="default_sender"
              value={formData.default_sender}
              onChange={(e) => setFormData({ ...formData, default_sender: e.target.value })}
              placeholder="Urbix"
            />
            <p className="text-xs text-[#777777] mt-1">Nombre que aparecerá como remitente (máx. 11 caracteres)</p>
          </div>

          <div>
            <Label htmlFor="webhook_url">Webhook URL (opcional)</Label>
            <Input
              id="webhook_url"
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              placeholder="https://tu-dominio.com/api/webhooks/sms"
            />
            <p className="text-xs text-[#777777] mt-1">URL para recibir notificaciones de estado de entrega</p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="test_mode"
              checked={formData.test_mode}
              onCheckedChange={(checked) => setFormData({ ...formData, test_mode: !!checked })}
            />
            <Label htmlFor="test_mode" className="cursor-pointer">
              Modo de Prueba
            </Label>
          </div>
          {formData.test_mode && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Modo de prueba activado. Los SMS no se enviarán realmente al proveedor.
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="border-[#164AA6] text-[#164AA6] bg-transparent">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar SMS de Prueba
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Enviar SMS de Prueba</DialogTitle>
                  <DialogDescription>
                    Configura y envía un SMS de prueba para verificar la integración
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="test_phone">Número de Teléfono</Label>
                    <Input
                      id="test_phone"
                      type="tel"
                      value={testData.phone_number}
                      onChange={(e) => setTestData({ ...testData, phone_number: e.target.value })}
                      placeholder="+34612345678"
                      required
                    />
                    <p className="text-xs text-[#777777] mt-1">Incluye el código de país</p>
                  </div>

                  <div>
                    <Label htmlFor="test_template">Plantilla (opcional)</Label>
                    <Select
                      value={testData.template_key}
                      onValueChange={(value) => setTestData({ ...testData, template_key: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="SMS de prueba genérico" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="generic">SMS de prueba genérico</SelectItem>
                        {templates.map((t: any) => (
                          <SelectItem key={t.key} value={t.key}>
                            {t.name} ({t.key})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {testData.template_key && (
                    <div>
                      <Label>Variables de prueba</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Input
                          placeholder="code"
                          value={testData.variables.code || ""}
                          onChange={(e) =>
                            setTestData({ ...testData, variables: { ...testData.variables, code: e.target.value } })
                          }
                        />
                        <Input
                          placeholder="123456"
                          value={testData.variables.code || "123456"}
                          disabled
                          className="bg-[#F2F2F2]"
                        />
                      </div>
                      <p className="text-xs text-[#777777] mt-1">Las variables se sustituirán en la plantilla</p>
                    </div>
                  )}

                  {formData.test_mode && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-800">Modo test activo: El SMS no se enviará realmente</p>
                    </div>
                  )}

                  {testResult && (
                    <div
                      className={`p-4 rounded-lg flex items-start gap-3 ${
                        testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                          {testResult.message}
                        </p>
                        {testResult.details && (
                          <div className="mt-2 text-xs text-[#777777]">
                            <p>Teléfono: {testResult.details.phone}</p>
                            <p>Segmentos: {testResult.details.segments}</p>
                            {testResult.details.body && (
                              <p className="mt-1 p-2 bg-white rounded border">
                                {testResult.details.body.substring(0, 100)}...
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setTestDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSendTestSMS}
                      disabled={isSendingTest || !testData.phone_number}
                      className="bg-[#164AA6] hover:bg-[#164AA6]/90"
                    >
                      {isSendingTest ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Prueba
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button type="submit" disabled={isSaving} className="bg-[#164AA6] hover:bg-[#164AA6]/90">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
