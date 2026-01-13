"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, AlertTriangle, CheckCircle2 } from "lucide-react"

interface PortalConfig {
  google_oauth_enabled: boolean
  magic_link_enabled: boolean
  password_login_enabled: boolean
}

export function InvestorPortalSettings() {
  const [config, setConfig] = useState<PortalConfig>({
    google_oauth_enabled: true,
    magic_link_enabled: true,
    password_login_enabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const response = await fetch("/api/admin/settings/investor-portal")
      if (!response.ok) throw new Error("Failed to fetch configuration")
      const data = await response.json()
      setConfig(data.config)
    } catch (error) {
      setMessage({ type: "error", text: "Error al cargar la configuración" })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/admin/settings/investor-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })

      if (!response.ok) throw new Error("Failed to save configuration")

      setMessage({ type: "success", text: "Configuración guardada correctamente" })
    } catch (error) {
      setMessage({ type: "error", text: "Error al guardar la configuración" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const atLeastOneEnabled = config.google_oauth_enabled || config.magic_link_enabled || config.password_login_enabled

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {!atLeastOneEnabled && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            ⚠️ Advertencia: Debes mantener al menos un método de autenticación habilitado para que los inversores puedan
            acceder al portal.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Métodos de Autenticación</CardTitle>
          <CardDescription>
            Configura qué métodos de inicio de sesión están disponibles en el portal de inversores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1 flex-1">
              <Label htmlFor="google-oauth" className="text-base font-medium">
                Google OAuth
              </Label>
              <p className="text-sm text-muted-foreground">
                Permite a los inversores iniciar sesión con su cuenta de Google
              </p>
            </div>
            <Switch
              id="google-oauth"
              checked={config.google_oauth_enabled}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, google_oauth_enabled: checked }))}
              disabled={config.google_oauth_enabled && !config.magic_link_enabled && !config.password_login_enabled}
            />
          </div>

          <div className="flex items-center justify-between space-x-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1 flex-1">
              <Label htmlFor="magic-link" className="text-base font-medium">
                Magic Link (Email)
              </Label>
              <p className="text-sm text-muted-foreground">
                Permite a los inversores iniciar sesión mediante un enlace enviado por email
              </p>
            </div>
            <Switch
              id="magic-link"
              checked={config.magic_link_enabled}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, magic_link_enabled: checked }))}
              disabled={config.magic_link_enabled && !config.google_oauth_enabled && !config.password_login_enabled}
            />
          </div>

          <div className="flex items-center justify-between space-x-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1 flex-1">
              <Label htmlFor="password-login" className="text-base font-medium">
                Email y Contraseña
              </Label>
              <p className="text-sm text-muted-foreground">
                Permite a los inversores iniciar sesión con email y contraseña tradicional
              </p>
            </div>
            <Switch
              id="password-login"
              checked={config.password_login_enabled}
              onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, password_login_enabled: checked }))}
              disabled={config.password_login_enabled && !config.google_oauth_enabled && !config.magic_link_enabled}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !atLeastOneEnabled} size="lg">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
