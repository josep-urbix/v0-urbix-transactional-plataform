"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function LemonwayTestPanel() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [endpoint, setEndpoint] = useState("accounts/retrieve")
  const [accountId, setAccountId] = useState("104")
  const [email, setEmail] = useState("kenton_test@lemonway.fr")
  const [walletId, setWalletId] = useState("")
  const { toast } = useToast()

  const testEndpoint = async () => {
    setLoading(true)
    setResponse(null)
    try {
      const data: any = {}
      if (accountId) data.accountId = accountId
      if (email) data.email = email
      if (walletId) data.walletId = walletId

      const res = await fetch("/api/lemonway/test-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, data }),
      })

      const result = await res.json()
      setResponse(result)

      if (res.ok) {
        toast({
          title: "Petición exitosa",
          description: `Endpoint ${endpoint} respondió correctamente`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al llamar a la API",
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
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test de Endpoints de Lemonway</CardTitle>
          <CardDescription>
            Prueba los diferentes endpoints de la API de Lemonway para ver su respuesta real
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint-select">Endpoint</Label>
            <select
              id="endpoint-select"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="accounts/retrieve">accounts/retrieve</option>
              <option value="accounts/list">accounts/list</option>
              <option value="transactions/list">transactions/list</option>
            </select>
          </div>

          {endpoint === "accounts/retrieve" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="account-id-input">Account ID</Label>
                <Input
                  id="account-id-input"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="104"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-input">Email</Label>
                <Input
                  id="email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kenton_test@lemonway.fr"
                />
              </div>
            </>
          )}

          {endpoint === "transactions/list" && (
            <div className="space-y-2">
              <Label htmlFor="wallet-id-input">Wallet ID (opcional)</Label>
              <Input
                id="wallet-id-input"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                placeholder="ID de wallet"
              />
            </div>
          )}

          <Button onClick={testEndpoint} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Probar Endpoint
          </Button>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardHeader>
            <CardTitle>Respuesta de la API</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>Estructura:</strong> {JSON.stringify(response.responseStructure)}
              </div>
              <div>
                <Label htmlFor="response-textarea">Respuesta completa:</Label>
                <Textarea
                  id="response-textarea"
                  value={JSON.stringify(response.response, null, 2)}
                  readOnly
                  className="font-mono text-xs h-96"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
