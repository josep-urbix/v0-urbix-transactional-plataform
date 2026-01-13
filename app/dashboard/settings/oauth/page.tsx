"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Loader2,
  Save,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  PlayCircle,
  Clock,
  Trash2,
  AlertTriangle,
} from "lucide-react"

interface TestLog {
  id: string
  timestamp: Date
  action: string
  status: "success" | "error" | "warning"
  message: string
  details?: string
}

export default function OAuthSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [testing, setTesting] = useState(false)
  const [testLogs, setTestLogs] = useState<TestLog[]>([])
  const [logsEnabled, setLogsEnabled] = useState(true)

  const [settings, setSettings] = useState({
    google_client_id: "",
    google_client_secret: "",
    allowed_email_domains: "urbix.es",
    configured: false,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings/oauth")
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/settings/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Configuración guardada correctamente" })
        fetchSettings()

        if (logsEnabled) {
          setTestLogs((prev) => [
            {
              id: Date.now().toString(),
              timestamp: new Date(),
              action: "Configuración guardada",
              status: "success",
              message: "Los cambios se han guardado correctamente",
            },
            ...prev,
          ])
        }
      } else {
        const data = await res.json()
        setMessage({ type: "error", text: data.error || "Error al guardar" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (!settings.google_client_id) {
      if (logsEnabled) {
        setTestLogs((prev) => [
          {
            id: Date.now().toString(),
            timestamp: new Date(),
            action: "Validación",
            status: "error",
            message: "Client ID es requerido",
          },
          ...prev,
        ])
      }
      return
    }

    if (!settings.google_client_secret && !settings.configured) {
      if (logsEnabled) {
        setTestLogs((prev) => [
          {
            id: Date.now().toString(),
            timestamp: new Date(),
            action: "Validación",
            status: "error",
            message: "Client Secret es requerido. Introduce y guarda el secret primero.",
          },
          ...prev,
        ])
      }
      return
    }

    setTesting(true)
    if (logsEnabled) {
      setTestLogs((prev) => [
        {
          id: Date.now().toString(),
          timestamp: new Date(),
          action: "Iniciando prueba",
          status: "warning",
          message: "Conectando con Google APIs...",
        },
        ...prev,
      ])
    }

    try {
      const response = await fetch("/api/admin/settings/oauth/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: settings.google_client_id,
          clientSecret: settings.google_client_secret || undefined,
        }),
      })

      const data = await response.json()

      if (logsEnabled) {
        if (data.success) {
          setTestLogs((prev) => [
            {
              id: Date.now().toString(),
              timestamp: new Date(),
              action: "Prueba completada",
              status: "success",
              message: data.message,
              details: data.details,
            },
            ...prev,
          ])
        } else {
          setTestLogs((prev) => [
            {
              id: Date.now().toString(),
              timestamp: new Date(),
              action: "Prueba fallida",
              status: "error",
              message: data.error || "Error desconocido",
              details: data.details,
            },
            ...prev,
          ])
        }
      }
    } catch (error) {
      if (logsEnabled) {
        setTestLogs((prev) => [
          {
            id: Date.now().toString(),
            timestamp: new Date(),
            action: "Error de conexión",
            status: "error",
            message: "No se pudo conectar con el servidor",
            details: error instanceof Error ? error.message : "Error desconocido",
          },
          ...prev,
        ])
      }
    } finally {
      setTesting(false)
    }
  }

  const clearLogs = () => {
    setTestLogs([])
  }

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#164AA6]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración OAuth (empleados) </h1>
        <p className="text-[#777777] mt-1">Configura la autenticación con Google para el panel de administración</p>
      </div>

      {message && (
        <Alert className={message.type === "success" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
          <AlertDescription className={message.type === "success" ? "text-green-700" : "text-red-700"}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="border-t-4 border-t-[#164AA6] rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google OAuth
              </CardTitle>
              <CardDescription>Configuración independiente para el login del middleware</CardDescription>
            </div>
            <Badge className={settings.configured ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
              {settings.configured ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Configurado
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" /> No configurado
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="client_id">Client ID</Label>
            <Input
              id="client_id"
              value={settings.google_client_id}
              onChange={(e) => setSettings({ ...settings, google_client_id: e.target.value })}
              placeholder="xxxxxxxxxx.apps.googleusercontent.com"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_secret">Client Secret</Label>
            <div className="relative">
              <Input
                id="client_secret"
                type={showSecret ? "text" : "password"}
                value={settings.google_client_secret}
                onChange={(e) => setSettings({ ...settings, google_client_secret: e.target.value })}
                placeholder="GOCSPX-xxxxxxxxxx"
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-[#777777]">Deja vacío para mantener el valor actual</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domains">Dominios de email permitidos</Label>
            <Input
              id="domains"
              value={settings.allowed_email_domains}
              onChange={(e) => setSettings({ ...settings, allowed_email_domains: e.target.value })}
              placeholder="urbix.es, otro-dominio.com"
            />
            <p className="text-xs text-[#777777]">
              Separa múltiples dominios con comas. Solo usuarios con estos dominios podrán acceder.
            </p>
          </div>

          <div className="pt-4 border-t flex items-center justify-between">
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#0FB7EA] hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir Google Cloud Console
            </a>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={
                  testing || !settings.google_client_id || (!settings.google_client_secret && !settings.configured)
                }
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {testing ? "Probando..." : "Probar Conexión"}
              </Button>
              <Button onClick={handleSave} disabled={saving} className="bg-[#164AA6] hover:bg-[#133d8a]">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Logs de Servicio Google OAuth
              </h4>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-2">
                  <span className="text-sm text-[#777777]">{logsEnabled ? "Activados" : "Desactivados"}</span>
                  <button
                    onClick={() => setLogsEnabled(!logsEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      logsEnabled ? "bg-[#164AA6]" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        logsEnabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                {testLogs.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearLogs}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
            {!logsEnabled ? (
              <p className="text-sm text-[#777777] text-center py-4">Los logs están desactivados</p>
            ) : testLogs.length === 0 ? (
              <p className="text-sm text-[#777777] text-center py-4">No hay logs de pruebas aún</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {testLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border ${
                      log.status === "success"
                        ? "bg-green-50 border-green-200"
                        : log.status === "error"
                          ? "bg-red-50 border-red-200"
                          : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {log.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        {log.status === "error" && <XCircle className="h-4 w-4 text-red-600" />}
                        {log.status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                        <span className="font-medium text-sm">{log.action}</span>
                      </div>
                      <span className="text-xs text-[#777777]">{formatTimestamp(log.timestamp)}</span>
                    </div>
                    <p className="text-sm mt-1">{log.message}</p>
                    {log.details && (
                      <pre className="text-xs mt-2 p-2 bg-white/50 rounded overflow-x-auto whitespace-pre-wrap">
                        {log.details}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instrucciones de configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[#777777]">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Ve a{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0FB7EA] hover:underline"
              >
                Google Cloud Console
              </a>
            </li>
            <li>Crea un nuevo proyecto o selecciona uno existente</li>
            <li>Ve a "Credenciales" y crea un "ID de cliente de OAuth 2.0"</li>
            <li>Selecciona "Aplicación web" como tipo</li>
            <li>
              Añade los orígenes autorizados:
              <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">https://integrations.urbix.es</code>
            </li>
            <li>
              Añade las URIs de redireccionamiento:
              <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
                https://integrations.urbix.es/auth/callback/google
              </code>
            </li>
            <li>Copia el Client ID y Client Secret y pégalos arriba</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
