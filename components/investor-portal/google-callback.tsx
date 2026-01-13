"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { useInvestorAuth } from "@/hooks/use-investor-auth"

interface PaymentAccountInfo {
  exists: boolean
  account?: {
    accountId: string
    status: string
    balance: number
    isBlocked: boolean
    currency: string
  }
}

function GoogleCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setAuthenticatedUser } = useInvestorAuth()
  const [status, setStatus] = useState<"loading" | "checking_account" | "success" | "error">("loading")
  const [error, setError] = useState<string | null>(null)
  const [paymentAccount, setPaymentAccount] = useState<PaymentAccountInfo | null>(null)

  useEffect(() => {
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const errorParam = searchParams.get("error")

    if (errorParam) {
      setStatus("error")
      setError(getErrorMessage(errorParam))
      sessionStorage.removeItem("investor_auth_pending")
      return
    }

    if (!code || !state) {
      setStatus("error")
      setError("Código de autorización no recibido")
      sessionStorage.removeItem("investor_auth_pending")
      return
    }

    exchangeCode(code, state)
  }, [searchParams])

  function getErrorMessage(errorCode: string): string {
    const messages: Record<string, string> = {
      access_denied: "Acceso denegado. Has cancelado el inicio de sesión.",
      invalid_state: "La sesión ha expirado. Por favor, intenta de nuevo.",
      missing_params: "Parámetros faltantes en la respuesta.",
      server_error: "Error del servidor. Por favor, intenta de nuevo.",
    }
    return messages[errorCode] || "Error de autenticación desconocido"
  }

  async function exchangeCode(code: string, state: string) {
    try {
      // Recuperar device fingerprint guardado antes de iniciar OAuth
      const deviceFingerprint = localStorage.getItem("investor_oauth_device_fingerprint")

      const res = await fetch("/api/investors/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          state,
          device_fingerprint: deviceFingerprint,
        }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        // Limpiar datos temporales
        localStorage.removeItem("investor_oauth_state")
        localStorage.removeItem("investor_oauth_device_fingerprint")
        sessionStorage.removeItem("investor_auth_pending")

        // Guardar sesión
        if (setAuthenticatedUser && data.user) {
          setAuthenticatedUser(data.user, data.access_token, data.refresh_token)
        } else {
          localStorage.setItem("investor_access_token", data.access_token)
          localStorage.setItem("investor_refresh_token", data.refresh_token)
        }

        setStatus("checking_account")
        await checkPaymentAccount(data.user.email, data.access_token)
      } else {
        sessionStorage.removeItem("investor_auth_pending")
        setStatus("error")
        setError(data.error || "Error de autenticación con Google")
      }
    } catch (err) {
      console.error("[v0] Exchange error:", err)
      sessionStorage.removeItem("investor_auth_pending")
      setStatus("error")
      setError("Error de conexión. Por favor, intenta de nuevo.")
    }
  }

  async function checkPaymentAccount(email: string, accessToken: string) {
    try {
      const res = await fetch(`/api/investors/payment-account?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      const data = await res.json()
      setPaymentAccount(data)

      if (data.exists && data.account) {
        localStorage.setItem("investor_payment_account", JSON.stringify(data.account))
      } else {
        localStorage.removeItem("investor_payment_account")
      }

      setStatus("success")

      setTimeout(() => {
        router.replace("/investor-portal/dashboard")
      }, 2000)
    } catch (err) {
      // Si falla la verificación de cuenta, igual continuamos
      setStatus("success")
      setTimeout(() => {
        router.replace("/investor-portal/dashboard")
      }, 1500)
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
              <CardTitle>Autenticando...</CardTitle>
              <CardDescription>Verificando tu cuenta de Google</CardDescription>
            </>
          )}
          {status === "checking_account" && (
            <>
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <CardTitle>Verificando cuenta de pago...</CardTitle>
              <CardDescription>Consultando tu información financiera</CardDescription>
            </>
          )}
          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-600">Autenticación exitosa</CardTitle>
              <CardDescription>
                {paymentAccount?.exists ? "Cuenta de pago encontrada" : "No tienes cuenta de pago vinculada"}
              </CardDescription>
            </>
          )}
          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Error de autenticación</CardTitle>
              <CardDescription>{error}</CardDescription>
            </>
          )}
        </CardHeader>

        {status === "success" && paymentAccount?.exists && paymentAccount.account && (
          <CardContent className="space-y-3">
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Estado</span>
                <span
                  className={`text-sm font-medium ${paymentAccount.account.isBlocked ? "text-red-600" : "text-green-600"}`}
                >
                  {paymentAccount.account.isBlocked ? "Bloqueada" : paymentAccount.account.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="text-sm font-medium">
                  {paymentAccount.account.balance.toLocaleString("es-ES", {
                    style: "currency",
                    currency: paymentAccount.account.currency,
                  })}
                </span>
              </div>
              {paymentAccount.account.isBlocked && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-red-600 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Tu cuenta está bloqueada</span>
                </div>
              )}
            </div>
            <p className="text-xs text-center text-muted-foreground">Redirigiendo a tu panel...</p>
          </CardContent>
        )}

        {status === "success" && !paymentAccount?.exists && (
          <CardContent>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                No tienes una cuenta de pago asociada a tu email.
              </p>
            </div>
            <p className="text-xs text-center text-muted-foreground mt-3">Redirigiendo a tu panel...</p>
          </CardContent>
        )}

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

export function GoogleCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-t-4 border-t-[#164AA6]">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-[#164AA6]/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-[#164AA6] animate-spin" />
              </div>
              <CardTitle>Cargando...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  )
}
