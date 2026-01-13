"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Copy,
  AlertTriangle,
  FileJson,
  FileText,
} from "lucide-react"
import type { WebhookDelivery, ProcessingStatus, EventType } from "@/lib/types/lemonway-webhook"

interface WebhookDetailProps {
  webhookId: string
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  BLOCKED_ACCOUNT_STATUS_CHANGE: "Cambio Estado Cuenta Bloqueada",
  WALLET_STATUS_CHANGE: "Cambio Estado Wallet",
  MONEY_IN_WIRE: "Money-In Transferencia",
  MONEY_IN_SDD: "Money-In SDD",
  MONEY_IN_CHEQUE: "Money-In Cheque",
  MONEY_IN_CARD_SUBSCRIPTION: "Money-In Card Suscripción",
  MONEY_IN_SOFORT: "Money-In Sofort",
  MONEY_IN_CHARGEBACK: "Chargeback Money-In",
  MONEY_IN_CHEQUE_CANCELED: "Cheque Cancelado",
  MONEY_IN_SDD_CANCELED: "SDD Cancelado",
  MONEY_OUT_STATUS: "Estado Money-Out",
  MONEY_OUT_CANCELLED: "Money-Out Cancelado",
  DOCUMENT_STATUS_CHANGE: "Cambio Estado Documento",
  CHARGEBACK: "Chargeback",
  UNKNOWN: "Desconocido",
}

export function LemonwayWebhookDetail({ webhookId }: WebhookDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reprocessing, setReprocessing] = useState(false)
  const [webhook, setWebhook] = useState<WebhookDelivery | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchWebhook = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/lemonway/webhooks/${webhookId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error fetching webhook")
      }

      setWebhook(data.webhook)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWebhook()
  }, [webhookId])

  const handleReprocess = async () => {
    setReprocessing(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const response = await fetch(`/api/admin/lemonway/webhooks/${webhookId}/reprocess`, {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        setSuccessMessage("Webhook reprocesado correctamente")
        fetchWebhook()
      } else {
        setError(data.error || "Error al reprocesar el webhook")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setReprocessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getStatusBadge = (status: ProcessingStatus) => {
    switch (status) {
      case "PROCESSED":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Procesado
          </Badge>
        )
      case "FAILED":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="w-3 h-3 mr-1" />
            Fallido
          </Badge>
        )
      case "PROCESSING":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Procesando
          </Badge>
        )
      case "RECEIVED":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatAmount = (amount: number | null) => {
    if (amount === null) return "-"
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error && !webhook) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!webhook) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push("/dashboard/lemonway-webhooks")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detalle Webhook</h1>
            <p className="text-sm text-muted-foreground font-mono">{webhook.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchWebhook}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          {(webhook.processing_status === "FAILED" || webhook.processing_status === "RECEIVED") && (
            <Button onClick={handleReprocess} disabled={reprocessing}>
              {reprocessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Reprocesar
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Resumen</span>
            {getStatusBadge(webhook.processing_status)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">NotifCategory</p>
              <p className="font-medium">
                <Badge variant="outline" className="mr-2">
                  {webhook.notif_category}
                </Badge>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Evento</p>
              <p className="font-medium">{EVENT_TYPE_LABELS[webhook.event_type] || webhook.event_type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wallet Ext ID</p>
              <p className="font-mono text-sm">{webhook.wallet_ext_id || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wallet Int ID</p>
              <p className="font-mono text-sm">{webhook.wallet_int_id || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Transacción ID</p>
              <p className="font-mono text-sm">{webhook.transaction_id || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Importe</p>
              <p className="font-medium">{formatAmount(webhook.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status Code</p>
              <p className="font-mono text-sm">{webhook.status_code !== null ? webhook.status_code : "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reintentos</p>
              <p className="font-medium">{webhook.retry_count}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Recibido</p>
              <p className="font-mono text-sm">{formatDate(webhook.received_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Procesado</p>
              <p className="font-mono text-sm">{formatDate(webhook.processed_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Actualizado</p>
              <p className="font-mono text-sm">{formatDate(webhook.updated_at)}</p>
            </div>
          </div>

          {/* Error message */}
          {webhook.error_message && (
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground mb-2">Mensaje de Error</p>
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription className="font-mono text-sm">{webhook.error_message}</AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payload & Headers Tabs */}
      <Card>
        <Tabs defaultValue="payload">
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="payload" className="gap-2">
                <FileJson className="w-4 h-4" />
                Payload
              </TabsTrigger>
              <TabsTrigger value="headers" className="gap-2">
                <FileText className="w-4 h-4" />
                Headers
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="payload" className="mt-0">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(JSON.stringify(webhook.raw_payload, null, 2))}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[500px] text-sm font-mono">
                  {JSON.stringify(webhook.raw_payload, null, 2)}
                </pre>
              </div>
            </TabsContent>
            <TabsContent value="headers" className="mt-0">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(JSON.stringify(webhook.raw_headers, null, 2))}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[500px] text-sm font-mono">
                  {JSON.stringify(webhook.raw_headers, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
