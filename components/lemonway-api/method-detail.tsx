"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Method {
  id: string
  name: string
  category: string
  description: string
  endpoint: string
  http_method: string
  is_enabled: boolean
  request_schema: any
  response_schema: any
  example_request: any
  example_response: any
}

interface MethodDetailProps {
  methodId: string
  onTestExecuted?: () => void
}

export function LemonwayMethodDetail({ methodId, onTestExecuted }: MethodDetailProps) {
  const [method, setMethod] = useState<Method | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [requestPayload, setRequestPayload] = useState("")
  const [testResponse, setTestResponse] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchMethodDetail()
  }, [methodId])

  const fetchMethodDetail = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lemonway-api/methods/${methodId}`)
      if (!res.ok) throw new Error("Error al cargar detalle del método")
      const data = await res.json()
      setMethod(data.method)

      // Pre-fill with example request
      if (data.method.example_request) {
        setRequestPayload(JSON.stringify(data.method.example_request, null, 2))
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTest = async () => {
    if (!method) return

    setTesting(true)
    setTestResponse(null)

    try {
      const payload = JSON.parse(requestPayload)

      const res = await fetch("/api/lemonway-api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method_id: method.id,
          parameters: payload,
        }),
      })

      const data = await res.json()
      setTestResponse(data)

      if (res.ok && data.success) {
        toast({
          title: "Prueba exitosa",
          description: `El método ${method.name} se ejecutó correctamente`,
        })
        onTestExecuted?.()
      } else {
        toast({
          title: "Error en la prueba",
          description: data.error || "Error desconocido",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!method) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">No se pudo cargar el método</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {method.name}
                <Badge variant="outline">{method.http_method}</Badge>
                {method.is_enabled ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Inactivo
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{method.description}</CardDescription>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">{method.category}</Badge>
            <code className="text-xs bg-muted px-2 py-1 rounded">{method.endpoint}</code>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test">Probar</TabsTrigger>
          <TabsTrigger value="docs">Documentación</TabsTrigger>
          <TabsTrigger value="schemas">Schemas</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros de Entrada</CardTitle>
              <CardDescription>Modifica el JSON con los parámetros para probar el método</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Request Payload (JSON)</Label>
                <Textarea
                  value={requestPayload}
                  onChange={(e) => setRequestPayload(e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                  placeholder='{"param1": "value1"}'
                />
              </div>

              <Button onClick={handleTest} disabled={testing || !method.is_enabled} className="w-full">
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ejecutando...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Ejecutar Prueba
                  </>
                )}
              </Button>

              {!method.is_enabled && (
                <p className="text-sm text-muted-foreground text-center">
                  Este método está desactivado. Actívalo desde la lista para poder probarlo.
                </p>
              )}
            </CardContent>
          </Card>

          {testResponse && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Respuesta
                  {testResponse.success ? (
                    <Badge variant="default" className="bg-green-600">
                      Éxito
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Error</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testResponse.duration_ms && (
                    <div className="text-sm">
                      <strong>Duración:</strong> {testResponse.duration_ms}ms
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Respuesta (JSON)</Label>
                    <Textarea
                      value={JSON.stringify(testResponse.response || testResponse.error, null, 2)}
                      readOnly
                      className="font-mono text-xs min-h-[300px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Descripción</h4>
                <p className="text-sm text-muted-foreground">{method.description}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Endpoint</h4>
                <code className="text-sm bg-muted px-2 py-1 rounded block">{method.endpoint}</code>
              </div>

              <div>
                <h4 className="font-medium mb-2">Método HTTP</h4>
                <Badge variant="outline">{method.http_method}</Badge>
              </div>

              {method.example_request && (
                <div>
                  <h4 className="font-medium mb-2">Ejemplo de Request</h4>
                  <Textarea
                    value={JSON.stringify(method.example_request, null, 2)}
                    readOnly
                    className="font-mono text-xs min-h-[150px]"
                  />
                </div>
              )}

              {method.example_response && (
                <div>
                  <h4 className="font-medium mb-2">Ejemplo de Response</h4>
                  <Textarea
                    value={JSON.stringify(method.example_response, null, 2)}
                    readOnly
                    className="font-mono text-xs min-h-[150px]"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schemas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Request Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={JSON.stringify(method.request_schema, null, 2)}
                readOnly
                className="font-mono text-xs min-h-[200px]"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Schema</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={JSON.stringify(method.response_schema, null, 2)}
                readOnly
                className="font-mono text-xs min-h-[200px]"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
