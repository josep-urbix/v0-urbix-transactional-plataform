"use client"

import { useState } from "react"
import type { Node } from "@xyflow/react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { WorkflowStepType } from "@/lib/types/workflow"

interface StepConfigPanelProps {
  node: Node
  onUpdate: (updates: { label?: string; config?: Record<string, unknown> }) => void
  onDelete: () => void
}

export function StepConfigPanel({ node, onUpdate, onDelete }: StepConfigPanelProps) {
  const nodeData = node.data as {
    label: string
    type: WorkflowStepType | "TRIGGER"
    config: Record<string, unknown>
  }

  const [label, setLabel] = useState(nodeData.label)
  const [config, setConfig] = useState<Record<string, unknown>>(nodeData.config || {})

  const handleLabelChange = (value: string) => {
    setLabel(value)
    onUpdate({ label: value })
  }

  const handleConfigChange = (key: string, value: unknown) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    onUpdate({ config: newConfig })
  }

  // Render config form based on step type
  const renderConfigForm = () => {
    if (nodeData.type === "TRIGGER") {
      return renderTriggerConfig()
    }

    switch (nodeData.type) {
      case "SEND_EMAIL":
        return renderSendEmailConfig()
      case "CALL_INTERNAL_API":
        return renderCallInternalApiConfig()
      case "CALL_WEBHOOK":
        return renderCallWebhookConfig()
      case "DELAY":
        return renderDelayConfig()
      case "CONDITIONAL":
        return renderConditionalConfig()
      case "SET_VARIABLE":
        return renderSetVariableConfig()
      case "LOG":
        return renderLogConfig()
      default:
        return <p className="text-sm text-muted-foreground">No hay configuración disponible</p>
    }
  }

  const renderTriggerConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Evento</Label>
        <Select value={(config.eventKey as string) || ""} onValueChange={(v) => handleConfigChange("eventKey", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="investor.created">Inversor creado</SelectItem>
            <SelectItem value="investor.verified">Inversor verificado</SelectItem>
            <SelectItem value="transaction.created">Transacción creada</SelectItem>
            <SelectItem value="transaction.completed">Transacción completada</SelectItem>
            <SelectItem value="document.signed">Documento firmado</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderSendEmailConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Plantilla de email</Label>
        <Select
          value={(config.templateKey as string) || ""}
          onValueChange={(v) => handleConfigChange("templateKey", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona plantilla" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="welcome">Bienvenida</SelectItem>
            <SelectItem value="verification">Verificación</SelectItem>
            <SelectItem value="transaction_confirmed">Transacción confirmada</SelectItem>
            <SelectItem value="document_ready">Documento listo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Destinatario (expresión)</Label>
        <Input
          value={(config.toExpression as string) || ""}
          onChange={(e) => handleConfigChange("toExpression", e.target.value)}
          placeholder="{{payload.email}}"
        />
        <p className="mt-1 text-xs text-muted-foreground">Usa variables del contexto, ej: {"{{payload.email}}"}</p>
      </div>
      <div>
        <Label>Variables adicionales (JSON)</Label>
        <Textarea
          value={config.variables ? JSON.stringify(config.variables, null, 2) : "{}"}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              handleConfigChange("variables", parsed)
            } catch {}
          }}
          className="font-mono text-xs"
          rows={4}
        />
      </div>
    </div>
  )

  const renderCallInternalApiConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Método HTTP</Label>
        <Select value={(config.method as string) || "POST"} onValueChange={(v) => handleConfigChange("method", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Endpoint</Label>
        <Input
          value={(config.endpoint as string) || ""}
          onChange={(e) => handleConfigChange("endpoint", e.target.value)}
          placeholder="/api/internal/action"
        />
      </div>
      <div>
        <Label>Body (JSON)</Label>
        <Textarea
          value={config.body ? JSON.stringify(config.body, null, 2) : "{}"}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              handleConfigChange("body", parsed)
            } catch {}
          }}
          className="font-mono text-xs"
          rows={6}
        />
      </div>
    </div>
  )

  const renderCallWebhookConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>URL del webhook</Label>
        <Input
          value={(config.url as string) || ""}
          onChange={(e) => handleConfigChange("url", e.target.value)}
          placeholder="https://example.com/webhook"
        />
      </div>
      <div>
        <Label>Método HTTP</Label>
        <Select value={(config.method as string) || "POST"} onValueChange={(v) => handleConfigChange("method", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Headers (JSON)</Label>
        <Textarea
          value={config.headers ? JSON.stringify(config.headers, null, 2) : "{}"}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              handleConfigChange("headers", parsed)
            } catch {}
          }}
          className="font-mono text-xs"
          rows={3}
        />
      </div>
      <div>
        <Label>Body (JSON)</Label>
        <Textarea
          value={config.body ? JSON.stringify(config.body, null, 2) : "{}"}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              handleConfigChange("body", parsed)
            } catch {}
          }}
          className="font-mono text-xs"
          rows={4}
        />
      </div>
    </div>
  )

  const renderDelayConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Duración</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={(config.duration as number) || 1}
            onChange={(e) => handleConfigChange("duration", Number.parseInt(e.target.value) || 1)}
            min={1}
            className="w-24"
          />
          <Select value={(config.unit as string) || "minutes"} onValueChange={(v) => handleConfigChange("unit", v)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seconds">Segundos</SelectItem>
              <SelectItem value="minutes">Minutos</SelectItem>
              <SelectItem value="hours">Horas</SelectItem>
              <SelectItem value="days">Días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  const renderConditionalConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Campo a evaluar</Label>
        <Input
          value={(config.field as string) || ""}
          onChange={(e) => handleConfigChange("field", e.target.value)}
          placeholder="payload.status"
        />
      </div>
      <div>
        <Label>Operador</Label>
        <Select
          value={(config.operator as string) || "equals"}
          onValueChange={(v) => handleConfigChange("operator", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Igual a</SelectItem>
            <SelectItem value="not_equals">Diferente de</SelectItem>
            <SelectItem value="contains">Contiene</SelectItem>
            <SelectItem value="greater_than">Mayor que</SelectItem>
            <SelectItem value="less_than">Menor que</SelectItem>
            <SelectItem value="exists">Existe</SelectItem>
            <SelectItem value="not_exists">No existe</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Valor a comparar</Label>
        <Input
          value={(config.value as string) || ""}
          onChange={(e) => handleConfigChange("value", e.target.value)}
          placeholder="completed"
        />
      </div>
    </div>
  )

  const renderSetVariableConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Nombre de la variable</Label>
        <Input
          value={(config.variableName as string) || ""}
          onChange={(e) => handleConfigChange("variableName", e.target.value)}
          placeholder="myVariable"
        />
      </div>
      <div>
        <Label>Valor (expresión)</Label>
        <Textarea
          value={(config.valueExpression as string) || ""}
          onChange={(e) => handleConfigChange("valueExpression", e.target.value)}
          placeholder="{{payload.data.amount * 1.21}}"
          rows={3}
        />
        <p className="mt-1 text-xs text-muted-foreground">Puede ser un valor literal o una expresión con variables</p>
      </div>
    </div>
  )

  const renderLogConfig = () => (
    <div className="space-y-4">
      <div>
        <Label>Nivel de log</Label>
        <Select value={(config.level as string) || "info"} onValueChange={(v) => handleConfigChange("level", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="debug">Debug</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Mensaje</Label>
        <Textarea
          value={(config.message as string) || ""}
          onChange={(e) => handleConfigChange("message", e.target.value)}
          placeholder="Procesando {{payload.id}}..."
          rows={3}
        />
      </div>
    </div>
  )

  return (
    <ScrollArea className="mt-4 h-[calc(100vh-14rem)]">
      <Tabs defaultValue="config" className="pr-4">
        <TabsList className="w-full">
          <TabsTrigger value="config" className="flex-1">
            Configuración
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex-1">
            Avanzado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4 space-y-4">
          {/* Step name */}
          <div>
            <Label>Nombre del paso</Label>
            <Input value={label} onChange={(e) => handleLabelChange(e.target.value)} placeholder="Nombre descriptivo" />
          </div>

          <Separator />

          {/* Type-specific config */}
          {renderConfigForm()}
        </TabsContent>

        <TabsContent value="advanced" className="mt-4 space-y-4">
          <div>
            <Label>Reintentos en caso de error</Label>
            <Input
              type="number"
              value={(config.retryCount as number) || 0}
              onChange={(e) => handleConfigChange("retryCount", Number.parseInt(e.target.value) || 0)}
              min={0}
              max={5}
            />
          </div>
          <div>
            <Label>Timeout (segundos)</Label>
            <Input
              type="number"
              value={(config.timeoutSeconds as number) || 30}
              onChange={(e) => handleConfigChange("timeoutSeconds", Number.parseInt(e.target.value) || 30)}
              min={1}
              max={300}
            />
          </div>

          <Separator />

          {node.type !== "trigger" && (
            <Button variant="destructive" className="w-full" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar paso
            </Button>
          )}
        </TabsContent>
      </Tabs>
    </ScrollArea>
  )
}
