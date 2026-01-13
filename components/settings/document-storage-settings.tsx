"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, CheckCircle, AlertTriangle, Cloud, Server } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DocumentConfig {
  documentos_storage_provider: string
  documentos_aws_s3_bucket: string
  documentos_aws_s3_region: string
  documentos_aws_access_key_id: string
  documentos_aws_secret_access_key: string
  documentos_qr_token_expiry_minutes: string
  documentos_otp_expiry_minutes: string
  documentos_max_otp_attempts: string
  documentos_session_expiry_minutes: string
}

export function DocumentStorageSettings() {
  const [config, setConfig] = useState<DocumentConfig>({
    documentos_storage_provider: "vercel_blob",
    documentos_aws_s3_bucket: "",
    documentos_aws_s3_region: "eu-west-1",
    documentos_aws_access_key_id: "",
    documentos_aws_secret_access_key: "",
    documentos_qr_token_expiry_minutes: "10",
    documentos_otp_expiry_minutes: "5",
    documentos_max_otp_attempts: "3",
    documentos_session_expiry_minutes: "30",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch("/api/admin/settings/documents")
      if (res.ok) {
        const data = await res.json()
        setConfig((prev) => ({ ...prev, ...data.config }))
      }
    } catch (error) {
      console.error("Error fetching config:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch("/api/admin/settings/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al guardar")
      }

      setSaved(true)
      toast({ title: "Configuración guardada", description: "Los cambios se aplicaron correctamente" })
      setTimeout(() => setSaved(false), 3000)
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
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
      {/* Storage Provider */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Almacenamiento de PDFs
          </CardTitle>
          <CardDescription>
            Selecciona dónde se guardarán los documentos PDF firmados por los inversores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={config.documentos_storage_provider}
            onValueChange={(v) => setConfig({ ...config, documentos_storage_provider: v })}
            className="grid gap-4"
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <RadioGroupItem value="vercel_blob" id="vercel_blob" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="vercel_blob" className="font-medium cursor-pointer">
                  Vercel Blob (Recomendado para pruebas)
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Almacenamiento integrado con Vercel. Fácil de configurar, ideal para desarrollo y pruebas.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
              <RadioGroupItem value="aws_s3" id="aws_s3" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="aws_s3" className="font-medium cursor-pointer">
                  Amazon S3 (Producción)
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Almacenamiento empresarial escalable. Requiere configuración de credenciales AWS.
                </p>
              </div>
            </div>
          </RadioGroup>

          {config.documentos_storage_provider === "aws_s3" && (
            <div className="space-y-4 pt-4 border-t">
              <Alert>
                <Server className="h-4 w-4" />
                <AlertDescription>
                  Configura las credenciales de AWS para usar Amazon S3 como almacenamiento de documentos.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="s3_bucket">Nombre del Bucket</Label>
                  <Input
                    id="s3_bucket"
                    value={config.documentos_aws_s3_bucket}
                    onChange={(e) => setConfig({ ...config, documentos_aws_s3_bucket: e.target.value })}
                    placeholder="mi-bucket-documentos"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s3_region">Región</Label>
                  <Input
                    id="s3_region"
                    value={config.documentos_aws_s3_region}
                    onChange={(e) => setConfig({ ...config, documentos_aws_s3_region: e.target.value })}
                    placeholder="eu-west-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws_key">Access Key ID</Label>
                  <Input
                    id="aws_key"
                    value={config.documentos_aws_access_key_id}
                    onChange={(e) => setConfig({ ...config, documentos_aws_access_key_id: e.target.value })}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws_secret">Secret Access Key</Label>
                  <Input
                    id="aws_secret"
                    type="password"
                    value={config.documentos_aws_secret_access_key}
                    onChange={(e) => setConfig({ ...config, documentos_aws_secret_access_key: e.target.value })}
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Parámetros de Firma</CardTitle>
          <CardDescription>Configura los tiempos de expiración y límites del proceso de firma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qr_expiry">Expiración del Token QR (minutos)</Label>
              <Input
                id="qr_expiry"
                type="number"
                min="1"
                max="60"
                value={config.documentos_qr_token_expiry_minutes}
                onChange={(e) => setConfig({ ...config, documentos_qr_token_expiry_minutes: e.target.value })}
              />
              <p className="text-xs text-gray-500">Tiempo que el código QR permanece válido para firma móvil</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="otp_expiry">Expiración del OTP (minutos)</Label>
              <Input
                id="otp_expiry"
                type="number"
                min="1"
                max="15"
                value={config.documentos_otp_expiry_minutes}
                onChange={(e) => setConfig({ ...config, documentos_otp_expiry_minutes: e.target.value })}
              />
              <p className="text-xs text-gray-500">Tiempo que el código OTP permanece válido</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_attempts">Máximo intentos OTP</Label>
              <Input
                id="max_attempts"
                type="number"
                min="1"
                max="10"
                value={config.documentos_max_otp_attempts}
                onChange={(e) => setConfig({ ...config, documentos_max_otp_attempts: e.target.value })}
              />
              <p className="text-xs text-gray-500">Intentos permitidos antes de bloquear la sesión</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_expiry">Expiración de Sesión (minutos)</Label>
              <Input
                id="session_expiry"
                type="number"
                min="5"
                max="120"
                value={config.documentos_session_expiry_minutes}
                onChange={(e) => setConfig({ ...config, documentos_session_expiry_minutes: e.target.value })}
              />
              <p className="text-xs text-gray-500">Tiempo máximo para completar una firma</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning for AWS */}
      {config.documentos_storage_provider === "aws_s3" &&
        (!config.documentos_aws_s3_bucket || !config.documentos_aws_access_key_id) && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Debes completar la configuración de AWS S3 antes de guardar. Los campos Bucket y Access Key son
              obligatorios.
            </AlertDescription>
          </Alert>
        )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={
            saving ||
            (config.documentos_storage_provider === "aws_s3" &&
              (!config.documentos_aws_s3_bucket || !config.documentos_aws_access_key_id))
          }
          className="min-w-32"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Guardado
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
