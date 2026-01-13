"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Settings,
  PlayCircle,
  Clock,
  Trash2,
} from "lucide-react"

interface GoogleTestLog {
  id: string
  timestamp: Date
  action: string
  status: "success" | "error" | "warning"
  message: string
  details?: string
}

interface ConfigStatus {
  google: {
    configured: boolean
    clientId: string | null
    hasSecret: boolean
    needsSecretResave?: boolean // Added flag for migration
  }
  apple: {
    configured: boolean
    clientId: string | null
    teamId: string | null
    keyId: string | null
    hasPrivateKey: boolean
  }
  general: {
    portalUrl: string | null
    sessionDuration: number
    maxSessions: number
    requireEmailVerification: boolean
    require2FA: boolean
  }
}

export function InvestorSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<ConfigStatus | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Google OAuth form
  const [googleClientId, setGoogleClientId] = useState("")
  const [googleClientSecret, setGoogleClientSecret] = useState("")
  const [showGoogleSecret, setShowGoogleSecret] = useState(false)
  const [testingGoogle, setTestingGoogle] = useState(false)
  const [googleTestLogs, setGoogleTestLogs] = useState<GoogleTestLog[]>([])
  const [logsEnabled, setLogsEnabled] = useState(true)

  // Apple Sign-In form
  const [appleClientId, setAppleClientId] = useState("")
  const [appleTeamId, setAppleTeamId] = useState("")
  const [appleKeyId, setAppleKeyId] = useState("")
  const [applePrivateKey, setApplePrivateKey] = useState("")
  const [showAppleKey, setShowAppleKey] = useState(false)

  // General settings
  const [portalUrl, setPortalUrl] = useState("")
  const [sessionDuration, setSessionDuration] = useState(24)
  const [maxSessions, setMaxSessions] = useState(5)
  const [requireEmailVerification, setRequireEmailVerification] = useState(true)
  const [require2FA, setRequire2FA] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/investors/settings")
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
        // Populate form with existing values
        if (data.google.clientId) setGoogleClientId(data.google.clientId)
        if (data.apple.clientId) setAppleClientId(data.apple.clientId)
        if (data.apple.teamId) setAppleTeamId(data.apple.teamId)
        if (data.apple.keyId) setAppleKeyId(data.apple.keyId)
        if (data.general.portalUrl) setPortalUrl(data.general.portalUrl)
        if (data.general.sessionDuration) setSessionDuration(data.general.sessionDuration)
        if (data.general.maxSessions) setMaxSessions(data.general.maxSessions)
        setRequireEmailVerification(data.general.requireEmailVerification ?? true)
        setRequire2FA(data.general.require2FA ?? false)
      }
    } catch (err) {
      setError("Error al cargar la configuración")
    } finally {
      setLoading(false)
    }
  }

  const saveGoogleConfig = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      if (!status?.google.hasSecret && !googleClientSecret) {
        setError("Debes introducir el Client Secret")
        setSaving(false)
        return
      }

      const res = await fetch("/api/admin/investors/settings/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: googleClientId,
          clientSecret: googleClientSecret || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al guardar")
      }

      setSuccess("Configuración de Google guardada correctamente")
      setGoogleClientSecret("")
      fetchStatus()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setSaving(false)
    }
  }

  const saveAppleConfig = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const res = await fetch("/api/admin/investors/settings/apple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: appleClientId,
          teamId: appleTeamId,
          keyId: appleKeyId,
          privateKey: applePrivateKey || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al guardar")
      }

      setSuccess("Configuración de Apple guardada correctamente")
      setApplePrivateKey("")
      fetchStatus()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setSaving(false)
    }
  }

  const saveGeneralConfig = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const res = await fetch("/api/admin/investors/settings/general", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portalUrl,
          sessionDuration,
          maxSessions,
          requireEmailVerification,
          require2FA,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error al guardar")
      }

      setSuccess("Configuración general guardada correctamente")
      fetchStatus()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setSaving(false)
    }
  }

  const testGoogleConnection = async () => {
    if (!googleClientId) {
      if (logsEnabled) {
        setGoogleTestLogs((prev) => [
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

    if (!googleClientSecret && !status?.google.hasSecret) {
      if (logsEnabled) {
        setGoogleTestLogs((prev) => [
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

    setTestingGoogle(true)
    if (logsEnabled) {
      setGoogleTestLogs((prev) => [
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
      const response = await fetch("/api/admin/investors/settings/google/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: googleClientId,
          clientSecret: googleClientSecret || undefined,
        }),
      })

      const data = await response.json()

      if (logsEnabled) {
        if (data.success) {
          setGoogleTestLogs((prev) => [
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
          setGoogleTestLogs((prev) => [
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
        setGoogleTestLogs((prev) => [
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
      setTestingGoogle(false)
    }
  }

  const clearGoogleLogs = () => {
    setGoogleTestLogs([])
  }

  const formatTimestamp = (ts: Date) => {
    return ts.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const callbackUrl =
    typeof window !== "undefined" ? `${window.location.origin}/investor-portal/auth/callback/google` : ""

  const appleCallbackUrl =
    typeof window !== "undefined" ? `${window.location.origin}/investor-portal/auth/callback/apple` : ""

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="google" className="space-y-4">
        <TabsList>
          <TabsTrigger value="google" className="flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24">
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
            {status?.google.configured ? (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                Configurado
              </Badge>
            ) : status?.google.needsSecretResave ? (
              <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200">
                Requiere actualización
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="apple" className="flex items-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            Apple Sign-In
            {status?.apple.configured && (
              <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                Configurado
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="google">
          <Card>
            <CardHeader>
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
                Configuración de Google OAuth
              </CardTitle>
              <CardDescription>
                Configura las credenciales de Google Cloud Console para permitir inicio de sesión con Google
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {status?.google.needsSecretResave && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium">Acción requerida: Re-guardar Client Secret</p>
                    <p className="text-sm mt-1">
                      Se detectó una configuración antigua. Por favor, vuelve a introducir el Client Secret y guarda la
                      configuración.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Pasos para configurar Google OAuth:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>
                      Ve a{" "}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        Google Cloud Console
                      </a>
                    </li>
                    <li>Crea un nuevo proyecto o selecciona uno existente</li>
                    <li>Ve a "Credenciales" y crea un "ID de cliente OAuth 2.0"</li>
                    <li>Selecciona "Aplicación web" como tipo</li>
                    <li>Añade la URL de callback autorizada (ver abajo)</li>
                    <li>Copia el Client ID y Client Secret</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>URL de Callback (Añadir a Google Console)</Label>
                <div className="flex gap-2">
                  <Input value={callbackUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(callbackUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="google-client-id">Client ID</Label>
                  <Input
                    id="google-client-id"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    placeholder="xxxx.apps.googleusercontent.com"
                  />
                  {status?.google.clientId && (
                    <p className="text-xs text-muted-foreground">
                      Valor actual: {status.google.clientId.substring(0, 20)}...
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="google-client-secret">
                    Client Secret
                    {!status?.google.hasSecret && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Requerido
                      </Badge>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="google-client-secret"
                      type={showGoogleSecret ? "text" : "password"}
                      value={googleClientSecret}
                      onChange={(e) => setGoogleClientSecret(e.target.value)}
                      placeholder={status?.google.hasSecret ? "••••••••••••••••" : "Introduce el secret (requerido)"}
                    />
                    <Button variant="outline" size="icon" onClick={() => setShowGoogleSecret(!showGoogleSecret)}>
                      {showGoogleSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {status?.google.hasSecret ? (
                    <p className="text-xs text-green-600">Secret configurado. Deja vacío para mantener el actual.</p>
                  ) : (
                    <p className="text-xs text-red-600">
                      Debes introducir el Client Secret para completar la configuración.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center gap-2">
                  {status?.google.configured ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  ) : status?.google.needsSecretResave ? (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Requiere actualización
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      No configurado
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={testGoogleConnection}
                    disabled={testingGoogle || !googleClientId || (!googleClientSecret && !status?.google.hasSecret)}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    {testingGoogle ? "Probando..." : "Probar Conexión"}
                  </Button>
                  <Button onClick={saveGoogleConfig} disabled={saving || !googleClientId}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Guardando..." : "Guardar Configuración"}
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
                      <span className="text-sm text-muted-foreground">
                        {logsEnabled ? "Activados" : "Desactivados"}
                      </span>
                      <button
                        onClick={() => setLogsEnabled(!logsEnabled)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          logsEnabled ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            logsEnabled ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    {googleTestLogs.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearGoogleLogs}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>
                {!logsEnabled ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Los logs están desactivados</p>
                ) : googleTestLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay logs de pruebas aún</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {googleTestLogs.map((log) => (
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
                          <span className="text-xs text-muted-foreground">{formatTimestamp(log.timestamp)}</span>
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
        </TabsContent>

        <TabsContent value="apple">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Configuración de Apple Sign-In
              </CardTitle>
              <CardDescription>
                Configura las credenciales de Apple Developer para permitir inicio de sesión con Apple
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Pasos para configurar Apple Sign-In:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Ve a Apple Developer → Certificates, Identifiers & Profiles</li>
                    <li>Crea un Service ID con Sign in with Apple habilitado</li>
                    <li>Configura el dominio y URL de retorno</li>
                    <li>Genera una Key privada para Sign in with Apple</li>
                    <li>Copia el Service ID, Team ID, Key ID y la clave privada</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>URL de Callback (Añadir a Apple Developer)</Label>
                <div className="flex gap-2">
                  <Input value={appleCallbackUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(appleCallbackUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="apple-client-id">Service ID (Client ID)</Label>
                  <Input
                    id="apple-client-id"
                    value={appleClientId}
                    onChange={(e) => setAppleClientId(e.target.value)}
                    placeholder="com.yourcompany.webapp"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apple-team-id">Team ID</Label>
                  <Input
                    id="apple-team-id"
                    value={appleTeamId}
                    onChange={(e) => setAppleTeamId(e.target.value)}
                    placeholder="XXXXXXXXXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apple-key-id">Key ID</Label>
                <Input
                  id="apple-key-id"
                  value={appleKeyId}
                  onChange={(e) => setAppleKeyId(e.target.value)}
                  placeholder="XXXXXXXXXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="apple-private-key">Private Key (.p8)</Label>
                <div className="flex gap-2">
                  <Input
                    id="apple-private-key"
                    type={showAppleKey ? "text" : "password"}
                    value={applePrivateKey}
                    onChange={(e) => setApplePrivateKey(e.target.value)}
                    placeholder={status?.apple.hasPrivateKey ? "••••••••••••••••" : "Pega el contenido del archivo .p8"}
                  />
                  <Button variant="outline" size="icon" onClick={() => setShowAppleKey(!showAppleKey)}>
                    {showAppleKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {status?.apple.hasPrivateKey && (
                  <p className="text-xs text-green-600">Private Key configurada. Deja vacío para mantener la actual.</p>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex items-center gap-2">
                  {status?.apple.configured ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      No configurado
                    </Badge>
                  )}
                </div>
                <Button onClick={saveAppleConfig} disabled={saving || !appleClientId || !appleTeamId || !appleKeyId}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración General
              </CardTitle>
              <CardDescription>Ajustes generales del portal de inversores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="portal-url">URL del Portal de Inversores</Label>
                <Input
                  id="portal-url"
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  placeholder="https://desktop.urbix.es"
                />
                <p className="text-xs text-muted-foreground">URL donde está desplegado el portal de inversores</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="session-duration">Duración de Sesión (horas)</Label>
                  <Input
                    id="session-duration"
                    type="number"
                    min="1"
                    max="720"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number.parseInt(e.target.value) || 24)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-sessions">Máximo de Sesiones Simultáneas</Label>
                  <Input
                    id="max-sessions"
                    type="number"
                    min="1"
                    max="20"
                    value={maxSessions}
                    onChange={(e) => setMaxSessions(Number.parseInt(e.target.value) || 5)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Verificación de Email Obligatoria</Label>
                    <p className="text-xs text-muted-foreground">
                      Requiere que los usuarios verifiquen su email antes de acceder
                    </p>
                  </div>
                  <button
                    onClick={() => setRequireEmailVerification(!requireEmailVerification)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requireEmailVerification ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${requireEmailVerification ? "translate-x-6" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>2FA Obligatorio</Label>
                    <p className="text-xs text-muted-foreground">
                      Requiere autenticación de dos factores para todos los usuarios
                    </p>
                  </div>
                  <button
                    onClick={() => setRequire2FA(!require2FA)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${require2FA ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${require2FA ? "translate-x-6" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={saveGeneralConfig} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
