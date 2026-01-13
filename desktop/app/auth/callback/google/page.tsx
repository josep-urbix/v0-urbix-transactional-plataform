"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function GoogleCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const storedState = localStorage.getItem("oauth_state")

    if (!code || !state || state !== storedState) {
      setError("Error de autenticación: parámetros inválidos")
      return
    }

    localStorage.removeItem("oauth_state")

    try {
      const res = await fetch("/api/investors/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          state,
          redirect_uri: `${window.location.origin}/desktop/auth/callback/google`,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error de autenticación")
        return
      }

      localStorage.setItem("access_token", data.access_token)
      localStorage.setItem("refresh_token", data.refresh_token)
      router.push("/desktop/dashboard")
    } catch (err) {
      setError("Error de conexión")
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <a href="/desktop/login" className="text-primary hover:underline">
            Volver al login
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p>Completando autenticación...</p>
      </div>
    </div>
  )
}
