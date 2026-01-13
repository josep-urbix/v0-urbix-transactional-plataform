"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function MagicLinkVerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    verifyToken()
  }, [])

  async function verifyToken() {
    const token = searchParams.get("token")

    if (!token) {
      setStatus("error")
      setError("Token no proporcionado")
      return
    }

    try {
      const res = await fetch("/api/investors/auth/magic-link/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setError(data.error || "Error verificando el enlace")
        return
      }

      localStorage.setItem("access_token", data.access_token)
      localStorage.setItem("refresh_token", data.refresh_token)
      setStatus("success")

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/desktop/dashboard")
      }, 2000)
    } catch (err) {
      setStatus("error")
      setError("Error de conexión")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center max-w-md mx-auto p-8">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-xl font-semibold mb-2">Verificando enlace...</h2>
            <p className="text-muted-foreground">Por favor espera un momento</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">¡Acceso verificado!</h2>
            <p className="text-muted-foreground">Redirigiendo a tu panel...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Error de verificación</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push("/desktop/login")}>Volver al login</Button>
          </>
        )}
      </div>
    </div>
  )
}
