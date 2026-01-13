"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"

interface RetrySettingsProps {
  initialSettings: {
    retryDelaySeconds: number
    maxRetryAttempts: number
    manualRetryEnabled: boolean
    pollingIntervalSeconds: number
    processingGracePeriodSeconds: number
  } | null
}

export function LemonwayRetrySettings({ initialSettings }: RetrySettingsProps) {
  const [retryDelaySeconds, setRetryDelaySeconds] = useState(initialSettings?.retryDelaySeconds?.toString() || "120")
  const [maxRetryAttempts, setMaxRetryAttempts] = useState(initialSettings?.maxRetryAttempts?.toString() || "2")
  const [manualRetryEnabled, setManualRetryEnabled] = useState(initialSettings?.manualRetryEnabled ?? true)
  const [pollingIntervalSeconds, setPollingIntervalSeconds] = useState(
    initialSettings?.pollingIntervalSeconds?.toString() || "3",
  )
  const [processingGracePeriodSeconds, setProcessingGracePeriodSeconds] = useState(
    initialSettings?.processingGracePeriodSeconds?.toString() || "30",
  )
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)

    try {
      const response = await fetch("/api/app-config/lemonway-retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retryDelaySeconds: Number.parseInt(retryDelaySeconds),
          maxRetryAttempts: Number.parseInt(maxRetryAttempts),
          manualRetryEnabled,
          pollingIntervalSeconds: Number.parseInt(pollingIntervalSeconds),
          processingGracePeriodSeconds: Number.parseInt(processingGracePeriodSeconds),
        }),
      })

      if (!response.ok) {
        throw new Error("Error al guardar la configuración")
      }

      setMessage({ type: "success", text: "Configuración de reintentos guardada correctamente" })
    } catch (error) {
      console.error("[v0] Error saving retry settings:", error)
      setMessage({ type: "error", text: "Error al guardar la configuración de reintentos" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="retryDelay">Tiempo de espera entre reintentos (segundos)</Label>
          <Input
            id="retryDelay"
            type="number"
            min="1"
            max="3600"
            value={retryDelaySeconds}
            onChange={(e) => setRetryDelaySeconds(e.target.value)}
            placeholder="120"
          />
          <p className="text-xs text-muted-foreground">
            Tiempo que debe esperar el sistema antes de reintentar una petición fallida (recomendado: 120 segundos)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxRetries">Número máximo de reintentos automáticos</Label>
          <Input
            id="maxRetries"
            type="number"
            min="0"
            max="10"
            value={maxRetryAttempts}
            onChange={(e) => setMaxRetryAttempts(e.target.value)}
            placeholder="2"
          />
          <p className="text-xs text-muted-foreground">
            Número de veces que el sistema reintentará automáticamente una petición fallida antes de requerir
            intervención manual (recomendado: 2)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="pollingInterval">Intervalo de actualización automática (segundos)</Label>
          <Input
            id="pollingInterval"
            type="number"
            min="1"
            max="60"
            value={pollingIntervalSeconds}
            onChange={(e) => setPollingIntervalSeconds(e.target.value)}
            placeholder="3"
          />
          <p className="text-xs text-muted-foreground">
            Frecuencia con la que se actualiza automáticamente la página de transacciones cuando hay peticiones
            pendientes (recomendado: 3 segundos)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="processingGracePeriod">Tiempo de gracia para procesamiento (segundos)</Label>
          <Input
            id="processingGracePeriod"
            type="number"
            min="5"
            max="120"
            value={processingGracePeriodSeconds}
            onChange={(e) => setProcessingGracePeriodSeconds(e.target.value)}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">
            Tiempo que una petición se muestra como &quot;Procesando&quot; antes de mostrar el resultado real. Evita que
            se muestre &quot;Fallida&quot; prematuramente mientras el servidor procesa la petición (recomendado: 30
            segundos)
          </p>
        </div>

        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="manualRetry">Permitir reintentos manuales</Label>
            <p className="text-xs text-muted-foreground">
              Si está activado, se mostrará un botón para reintentar manualmente las peticiones que fallen después de
              todos los reintentos automáticos
            </p>
          </div>
          <Switch id="manualRetry" checked={manualRetryEnabled} onCheckedChange={setManualRetryEnabled} />
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="w-full">
        {isSaving ? "Guardando..." : "Guardar Configuración"}
      </Button>
    </div>
  )
}
