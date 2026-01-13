"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

export function MagicLinkVerify() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setStatus("error")
      setError("Token no válido")
      return
    }

    verifyToken(token)
  }, [searchParams])

  async function verifyToken(token: string) {
    try {
      const res = await fetch("/api/investors/auth/magic-link/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (res.ok) {
        localStorage.setItem("investor_access_token", data.access_token)
        localStorage.setItem("investor_refresh_token", data.refresh_token)
        setStatus("success")
        setTimeout(() => {
          router.push("/investor-portal/dashboard")
        }, 1500)
      } else {
        setStatus("error")
        setError(data.error || "Error verificando el enlace")
      }
    } catch (err) {
      setStatus("error")
      setError("Error de conexión")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <CardTitle>Verificando...</CardTitle>
              <CardDescription>Estamos verificando tu enlace de acceso</CardDescription>
            </>
          )}
          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-600">Acceso verificado</CardTitle>
              <CardDescription>Redirigiendo a tu panel...</CardDescription>
            </>
          )}
          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Error de verificación</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          )}
        </CardHeader>
        {status === "error" && (
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/investor-portal/login")}>
              Volver al inicio
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
