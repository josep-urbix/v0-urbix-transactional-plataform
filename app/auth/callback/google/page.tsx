"use client"

import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

function GoogleCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code")
      const state = searchParams.get("state")
      const errorParam = searchParams.get("error")

      if (errorParam) {
        setStatus("error")
        setError("Autenticación cancelada o denegada")
        return
      }

      if (!code || !state) {
        setStatus("error")
        setError("Parámetros de autenticación inválidos")
        return
      }

      // Validar state
      const savedState = localStorage.getItem("admin_oauth_state")
      if (state !== savedState) {
        setStatus("error")
        setError("State de seguridad inválido")
        return
      }

      try {
        const response = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            state,
            redirect_uri: `${window.location.origin}/auth/callback/google`,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setStatus("error")
          setError(data.error || "Error de autenticación")
          return
        }

        // Limpiar state
        localStorage.removeItem("admin_oauth_state")

        setStatus("success")

        // Redirigir al dashboard
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } catch (err) {
        setStatus("error")
        setError("Error de conexión")
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="flex flex-col items-center text-center">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-[#164AA6] animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Autenticando...</h2>
              <p className="text-[#777777]">Verificando credenciales con Google</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Autenticación exitosa</h2>
              <p className="text-[#777777]">Redirigiendo al panel de administración...</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error de autenticación</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-[#164AA6] text-white rounded-md hover:bg-[#0FB7EA] transition-colors"
              >
                Volver al login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-12 w-12 text-[#164AA6] animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Cargando...</h2>
            </div>
          </div>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  )
}
