/**
 * Mejora 7, 8, 9: API EXPLORER INTEGRADO
 * - Usa configuración centralizada
 * - Dry-run mode para seguridad
 * - Data masking para datos sensibles
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function ApiExplorerTab() {
  const [endpoint, setEndpoint] = useState("/wallets")
  const [method, setMethod] = useState("GET")
  const [payload, setPayload] = useState("{}")
  const [response, setResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dryRunMode, setDryRunMode] = useState(true)
  const [maskSensitiveData, setMaskSensitiveData] = useState(true)

  const handleExecute = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/lemonway/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          http_method: method,
          request_payload: JSON.parse(payload),
          execute_live: !dryRunMode,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setResponse(data.data)
      }
    } catch (error) {
      setResponse({ error: String(error) })
    } finally {
      setIsLoading(false)
    }
  }

  const maskData = (data: any): any => {
    if (!maskSensitiveData) return data

    // Máscara campos sensibles
    const masked = JSON.parse(JSON.stringify(data))

    const sensitiveFields = ["token", "password", "secret", "api_key", "privateKey"]
    const maskValue = (obj: any) => {
      for (const key in obj) {
        if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
          obj[key] = "***MASKED***"
        } else if (typeof obj[key] === "object") {
          maskValue(obj[key])
        }
      }
    }

    maskValue(masked)
    return masked
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Explorer Integrado</CardTitle>
          <CardDescription>Ejecuta queries contra Lemonway con configuración centralizada</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="border rounded px-3 py-2 bg-background"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>

            <Input
              placeholder="/endpoint"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="flex-1"
            />

            <div className="flex gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={dryRunMode} onChange={(e) => setDryRunMode(e.target.checked)} />
                <span className="text-sm">Dry-Run</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maskSensitiveData}
                  onChange={(e) => setMaskSensitiveData(e.target.checked)}
                />
                <span className="text-sm">Ocultar datos</span>
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Request Payload</label>
            <Textarea value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="{}" rows={6} />
          </div>

          <Button onClick={handleExecute} disabled={isLoading} className="w-full">
            {isLoading ? "Ejecutando..." : "Ejecutar"}
          </Button>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>Response</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="response">
              <TabsList>
                <TabsTrigger value="response">Response</TabsTrigger>
                <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="response" className="mt-4">
                <div className="bg-background p-4 rounded border">
                  <pre className="text-sm overflow-auto max-h-96">{JSON.stringify(maskData(response), null, 2)}</pre>
                </div>
              </TabsContent>

              <TabsContent value="raw" className="mt-4">
                <div className="bg-background p-4 rounded border">
                  <pre className="text-sm overflow-auto max-h-96">{JSON.stringify(response, null, 2)}</pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
