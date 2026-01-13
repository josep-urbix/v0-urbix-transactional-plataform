"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, RefreshCw, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import FieldMappingsCrud from "@/components/field-mappings-crud"

export default function LemonwayConfigForm() {
  const [loading, setLoading] = useState(false)
  const [loadingIP, setLoadingIP] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [publicIP, setPublicIP] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<{
    status: "connected" | "warning" | "disconnected" | "error"
    message: string
    pendingMessages: number
  } | null>(null)

  const [config, setConfig] = useState({
    environment: "sandbox",
    apiUrl: "", // Ahora solo para OAuth/AUTH2
    oauthUrl: "",
    accountsRetrieveUrl: "",
    accountsKycstatusUrl: "",
    accountsBalancesUrl: "",
    transactionsListUrl: "",
    apiToken: "",
    walletId: "",
    webhookSecret: "",
    companyName: "",
    companyWebsite: "",
    maxConcurrentRequests: 3,
    minDelayBetweenRequestsMs: 1000,
  })

  const [isEditingKey, setIsEditingKey] = useState(false)
  const [newKey, setNewKey] = useState("")

  const [loadingRetryConfig, setLoadingRetryConfig] = useState(false)
  const [savingRetryConfig, setSavingRetryConfig] = useState(false)
  const [retryMessage, setRetryMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [retryConfig, setRetryConfig] = useState({
    retryDelaySeconds: 120,
    maxRetryAttempts: 2,
    manualRetryEnabled: true,
    pollingIntervalSeconds: 3,
    processingGracePeriodSeconds: 30,
  })

  useEffect(() => {
    loadConfig()
    loadPublicIP()
    loadStatus()
    loadRetryConfig()
  }, [])

  const loadStatus = async () => {
    try {
      const response = await fetch("/api/lemonway/status")
      const data = await response.json()
      setConnectionStatus(data)
    } catch (error) {
      console.error("Error loading status:", error)
      setConnectionStatus({
        status: "error",
        message: "Error al cargar el estado",
        pendingMessages: 0,
      })
    }
  }

  const testConnection = async () => {
    setTestingConnection(true)
    setMessage(null)

    try {
      const response = await fetch("/api/lemonway/test-connection", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: "success", text: data.message })
        loadStatus()
      } else {
        setMessage({ type: "error", text: data.message || "Error al probar la conexión" })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    } finally {
      setTestingConnection(false)
    }
  }

  const getStatusBadge = () => {
    if (!connectionStatus) return null

    const { status, message, pendingMessages } = connectionStatus

    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </Badge>
        )
      case "warning":
        return (
          <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 gap-2">
            <AlertCircle className="h-4 w-4" />
            {message}
          </Badge>
        )
      case "disconnected":
      case "error":
        return (
          <Badge variant="destructive" className="gap-2">
            <XCircle className="h-4 w-4" />
            {message}
          </Badge>
        )
    }
  }

  const loadPublicIP = async () => {
    setLoadingIP(true)
    try {
      const response = await fetch("/api/system/ip")
      const data = await response.json()
      if (data.success && data.ip) {
        setPublicIP(data.ip)
      } else {
        setPublicIP(null)
      }
    } catch (error) {
      console.error("[v0] Error loading public IP:", error)
      setPublicIP(null)
    } finally {
      setLoadingIP(false)
    }
  }

  const copyIPToClipboard = () => {
    if (publicIP) {
      navigator.clipboard.writeText(publicIP)
      setMessage({ type: "success", text: "IP copiada al portapapeles" })
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const loadConfig = async () => {
    try {
      const response = await fetch("/api/lemonway/config")
      const data = await response.json()

      if (data.config) {
        setConfig({
          environment: data.config.environment || "sandbox",
          apiUrl: data.config.api_url || data.config.oauth_url || "", // OAuth URL
          oauthUrl: data.config.oauth_url || "",
          accountsRetrieveUrl: data.config.accounts_retrieve_url || "",
          accountsKycstatusUrl: data.config.accounts_kycstatus_url || "",
          accountsBalancesUrl: data.config.accounts_balances_url || "",
          transactionsListUrl: data.config.transactions_list_url || "",
          apiToken: data.config.api_token || "",
          walletId: data.config.wallet_id || "",
          webhookSecret: data.config.webhook_secret || "",
          companyName: data.config.company_name || "",
          companyWebsite: data.config.company_website || "",
          maxConcurrentRequests: data.config.max_concurrent_requests || 3,
          minDelayBetweenRequestsMs: data.config.min_delay_between_requests_ms || 1000,
        })
        if (data.config.api_token) {
          setIsEditingKey(false)
        } else {
          setIsEditingKey(true)
        }
      }
    } catch (error) {
      console.error("Error loading config:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const configToSave = {
      ...config,
      apiToken: isEditingKey && newKey ? newKey : config.apiToken,
    }

    try {
      const response = await fetch("/api/lemonway/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configToSave),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: "success", text: data.message })
        setIsEditingKey(false)
        setNewKey("")
        loadConfig()
        loadStatus()
      } else {
        setMessage({ type: "error", text: data.error })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const getMaskedKey = () => {
    if (!config.apiToken) return null
    const key = config.apiToken
    if (key.length > 8) {
      return `${key.slice(0, 8)}${"*".repeat(key.length - 12)}${key.slice(-4)}`
    }
    return "****"
  }

  const loadRetryConfig = async () => {
    setLoadingRetryConfig(true)
    try {
      const response = await fetch("/api/app-config/lemonway-retry")
      const data = await response.json()
      if (data) {
        setRetryConfig({
          retryDelaySeconds: data.retryDelaySeconds || 120,
          maxRetryAttempts: data.maxRetryAttempts || 2,
          manualRetryEnabled: data.manualRetryEnabled ?? true,
          pollingIntervalSeconds: data.pollingIntervalSeconds || 3,
          processingGracePeriodSeconds: data.processingGracePeriodSeconds || 30,
        })
      }
    } catch (error) {
      console.error("Error loading retry config:", error)
    } finally {
      setLoadingRetryConfig(false)
    }
  }

  const handleSaveRetryConfig = async () => {
    setSavingRetryConfig(true)
    setRetryMessage(null)

    try {
      const response = await fetch("/api/app-config/lemonway-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retryConfig),
      })

      if (!response.ok) {
        throw new Error("Error al guardar la configuración")
      }

      setRetryMessage({ type: "success", text: "Configuración de reintentos guardada correctamente" })
    } catch (error) {
      console.error("Error saving retry config:", error)
      setRetryMessage({ type: "error", text: "Error al guardar la configuración de reintentos" })
    } finally {
      setSavingRetryConfig(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estado de Conexión</CardTitle>
              <CardDescription>Estado actual de la integración con Lemonway</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Button type="button" variant="outline" size="icon" onClick={loadStatus} title="Actualizar estado">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>IP Pública del Servidor</span>
                {loadingIP && <RefreshCw className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {publicIP ? (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-blue-100 px-4 py-3 text-lg font-mono font-bold text-blue-900">
                {publicIP}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copyIPToClipboard} title="Copiar IP">
                <Copy className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={loadPublicIP} title="Actualizar IP">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                No se pudo detectar la IP del servidor.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Lemonway API</CardTitle>
            <CardDescription>Configura las credenciales y endpoints para conectar con Lemonway</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert variant={message.type === "error" ? "destructive" : "default"}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="endpoints">Endpoints API</TabsTrigger>
                <TabsTrigger value="rate-limiting">Rate Limiting</TabsTrigger>
                <TabsTrigger value="retries">Reintentos</TabsTrigger>
                <TabsTrigger value="mappings">Mapeos</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="environment">Entorno</Label>
                  <Select
                    value={config.environment}
                    onValueChange={(value) => setConfig({ ...config, environment: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Pruebas)</SelectItem>
                      <SelectItem value="production">Production (Producción)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key (OAuth 2.0)</Label>

                  {config.apiToken && !isEditingKey ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <code className="flex-1 bg-muted px-3 py-2 rounded-md font-mono text-sm">{getMaskedKey()}</code>
                        <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">Configurado</span>
                      </div>
                      <Button type="button" onClick={() => setIsEditingKey(true)} variant="outline" size="sm">
                        Actualizar API Key
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                      <div className="space-y-2">
                        <Input
                          id="apiKey"
                          type="password"
                          placeholder="c65625d2-9851-4915-8d62-272a8ece21aa"
                          value={newKey || config.apiToken}
                          onChange={(e) => {
                            if (isEditingKey) {
                              setNewKey(e.target.value)
                            } else {
                              setConfig({ ...config, apiToken: e.target.value })
                            }
                          }}
                          className="font-mono"
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          API Key básica generada desde el Dashboard de Lemonway. Se usa para obtener el Bearer Token
                          mediante OAuth 2.0.
                        </p>
                      </div>
                      {isEditingKey && config.apiToken && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingKey(false)
                            setNewKey("")
                          }}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="walletId">Wallet ID (Opcional)</Label>
                  <Input
                    id="walletId"
                    value={config.walletId}
                    onChange={(e) => setConfig({ ...config, walletId: e.target.value })}
                    placeholder="SC123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhookSecret">Webhook Secret (Opcional)</Label>
                  <Input
                    id="webhookSecret"
                    type="password"
                    value={config.webhookSecret}
                    onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                    placeholder="secret_key_para_webhooks"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    value={config.companyName}
                    onChange={(e) => setConfig({ ...config, companyName: e.target.value })}
                    placeholder="URBIX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">Website de la Empresa</Label>
                  <Input
                    id="companyWebsite"
                    value={config.companyWebsite}
                    onChange={(e) => setConfig({ ...config, companyWebsite: e.target.value })}
                    placeholder="https://urbix.es"
                  />
                </div>
              </TabsContent>

              <TabsContent value="endpoints" className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm text-blue-800">
                    <strong>Configuración de Endpoints API</strong>
                    <br />
                    Configura la URL específica de cada endpoint de la API de Lemonway. Si dejas un campo vacío, se
                    usará la URL por defecto del entorno seleccionado (Sandbox o Production).
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="oauthUrl">OAuth 2.0 URL (AUTH2)</Label>
                  <Input
                    id="oauthUrl"
                    value={config.oauthUrl}
                    onChange={(e) => setConfig({ ...config, oauthUrl: e.target.value })}
                    placeholder="https://sandbox-api.lemonway.fr/oauth/api/v1/oauth/token"
                  />
                  <p className="text-xs text-muted-foreground">
                    Endpoint para obtener el Bearer token mediante OAuth 2.0
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountsRetrieveUrl">Accounts Retrieve URL</Label>
                  <Input
                    id="accountsRetrieveUrl"
                    value={config.accountsRetrieveUrl}
                    onChange={(e) => setConfig({ ...config, accountsRetrieveUrl: e.target.value })}
                    placeholder="https://sandbox-api.lemonway.fr/mb/urbix/dev/directkitrest/v2/accounts/retrieve"
                  />
                  <p className="text-xs text-muted-foreground">Endpoint para obtener detalles de cuentas</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountsKycstatusUrl">Accounts KYC Status URL</Label>
                  <Input
                    id="accountsKycstatusUrl"
                    value={config.accountsKycstatusUrl}
                    onChange={(e) => setConfig({ ...config, accountsKycstatusUrl: e.target.value })}
                    placeholder="https://sandbox-api.lemonway.fr/mb/urbix/dev/directkitrest/v2/accounts/kycstatus"
                  />
                  <p className="text-xs text-muted-foreground">Endpoint para obtener estado KYC de cuentas</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountsBalancesUrl">Accounts Balances URL</Label>
                  <Input
                    id="accountsBalancesUrl"
                    value={config.accountsBalancesUrl}
                    onChange={(e) => setConfig({ ...config, accountsBalancesUrl: e.target.value })}
                    placeholder="https://sandbox-api.lemonway.fr/mb/urbix/dev/directkitrest/v2/accounts/balances"
                  />
                  <p className="text-xs text-muted-foreground">Endpoint para obtener balances de cuentas</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionsListUrl">Transactions List URL</Label>
                  <Input
                    id="transactionsListUrl"
                    value={config.transactionsListUrl}
                    onChange={(e) => setConfig({ ...config, transactionsListUrl: e.target.value })}
                    placeholder="https://sandbox-api.lemonway.fr/mb/urbix/dev/directkitrest/v2/transactions/list"
                  />
                  <p className="text-xs text-muted-foreground">Endpoint para listar transacciones</p>
                </div>
              </TabsContent>

              <TabsContent value="rate-limiting" className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm text-blue-800">
                    <strong>Control de Tasa de Peticiones (Rate Limiting)</strong>
                    <br />
                    Configura los límites para evitar sobrecargar el API de Lemonway
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="maxConcurrentRequests">Peticiones Simultáneas Máximas</Label>
                  <Input
                    id="maxConcurrentRequests"
                    type="number"
                    min="1"
                    max="10"
                    value={config.maxConcurrentRequests}
                    onChange={(e) =>
                      setConfig({ ...config, maxConcurrentRequests: Number.parseInt(e.target.value) || 3 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Número máximo de peticiones que se ejecutarán al mismo tiempo (recomendado: 3)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minDelayBetweenRequestsMs">Tiempo Mínimo Entre Peticiones (ms)</Label>
                  <Input
                    id="minDelayBetweenRequestsMs"
                    type="number"
                    min="100"
                    max="5000"
                    step="100"
                    value={config.minDelayBetweenRequestsMs}
                    onChange={(e) =>
                      setConfig({ ...config, minDelayBetweenRequestsMs: Number.parseInt(e.target.value) || 1000 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Tiempo de espera mínimo en milisegundos entre cada petición (recomendado: 1000ms = 1 segundo)
                  </p>
                </div>

                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-800">
                    <strong>¿Por qué es importante el rate limiting?</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Evita sobrecargar el API de Lemonway</li>
                      <li>Previene errores 429 (Too Many Requests)</li>
                      <li>Mejora la estabilidad de sincronizaciones múltiples</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="retries" className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm text-blue-800">
                    <strong>Configuración de Reintentos Automáticos</strong>
                    <br />
                    Configura el comportamiento de reintentos automáticos y manuales para las peticiones fallidas al API
                    de Lemonway
                  </AlertDescription>
                </Alert>

                {retryMessage && (
                  <Alert variant={retryMessage.type === "error" ? "destructive" : "default"}>
                    <AlertDescription>{retryMessage.text}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="retryDelaySeconds">Tiempo de espera entre reintentos (segundos)</Label>
                  <Input
                    id="retryDelaySeconds"
                    type="number"
                    min="1"
                    max="3600"
                    value={retryConfig.retryDelaySeconds}
                    onChange={(e) =>
                      setRetryConfig({ ...retryConfig, retryDelaySeconds: Number.parseInt(e.target.value) || 120 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Tiempo que debe esperar el sistema antes de reintentar una petición fallida (recomendado: 120
                    segundos)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxRetryAttempts">Número máximo de reintentos automáticos</Label>
                  <Input
                    id="maxRetryAttempts"
                    type="number"
                    min="0"
                    max="10"
                    value={retryConfig.maxRetryAttempts}
                    onChange={(e) =>
                      setRetryConfig({ ...retryConfig, maxRetryAttempts: Number.parseInt(e.target.value) || 2 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Número de veces que el sistema reintentará automáticamente una petición fallida (recomendado: 2)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pollingIntervalSeconds">Intervalo de actualización automática (segundos)</Label>
                  <Input
                    id="pollingIntervalSeconds"
                    type="number"
                    min="1"
                    max="60"
                    value={retryConfig.pollingIntervalSeconds}
                    onChange={(e) =>
                      setRetryConfig({ ...retryConfig, pollingIntervalSeconds: Number.parseInt(e.target.value) || 3 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Frecuencia con la que se actualiza automáticamente la página de transacciones (recomendado: 3
                    segundos)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="processingGracePeriodSeconds">Tiempo de gracia para procesamiento (segundos)</Label>
                  <Input
                    id="processingGracePeriodSeconds"
                    type="number"
                    min="5"
                    max="120"
                    value={retryConfig.processingGracePeriodSeconds}
                    onChange={(e) =>
                      setRetryConfig({
                        ...retryConfig,
                        processingGracePeriodSeconds: Number.parseInt(e.target.value) || 30,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Tiempo que una petición se muestra como &quot;Procesando&quot; antes de mostrar el resultado real
                    (recomendado: 30 segundos)
                  </p>
                </div>

                <div className="flex items-center justify-between space-x-2 py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="manualRetryEnabled">Permitir reintentos manuales</Label>
                    <p className="text-xs text-muted-foreground">
                      Si está activado, se mostrará un botón para reintentar manualmente las peticiones fallidas
                    </p>
                  </div>
                  <Switch
                    id="manualRetryEnabled"
                    checked={retryConfig.manualRetryEnabled}
                    onCheckedChange={(checked) => setRetryConfig({ ...retryConfig, manualRetryEnabled: checked })}
                  />
                </div>

                <Button type="button" onClick={handleSaveRetryConfig} disabled={savingRetryConfig} className="w-full">
                  {savingRetryConfig ? "Guardando..." : "Guardar Configuración de Reintentos"}
                </Button>
              </TabsContent>

              <TabsContent value="mappings" className="space-y-4">
                <FieldMappingsCrud />
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 pt-4 border-t">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Guardando..." : "Guardar Configuración"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={testingConnection}
                onClick={testConnection}
                className="flex-1 bg-transparent"
              >
                {testingConnection ? "Probando..." : "Probar Conexión"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
