"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { Mail, CheckCircle2 } from "lucide-react"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [resetUrl, setResetUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setShowSuccess(false)
    setResetUrl(null)

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al solicitar recuperación")
      }

      setShowSuccess(true)
      if (data.resetUrl) {
        setResetUrl(data.resetUrl)
      }
      setEmail("")
    } catch (error: any) {
      console.error("[v0] Forgot password error:", error)
      toast.error(error.message || "Error al solicitar recuperación de contraseña")
    } finally {
      setIsLoading(false)
    }
  }

  if (showSuccess) {
    return (
      <div className="space-y-4">
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Si el email existe en nuestro sistema, recibirás un enlace de recuperación en tu bandeja de entrada. Revisa
            también tu carpeta de spam.
          </AlertDescription>
        </Alert>

        {resetUrl && (
          <Alert>
            <AlertDescription className="space-y-2">
              <p className="font-medium text-sm">Modo Desarrollo:</p>
              <p className="text-xs break-all">
                <a href={resetUrl} className="text-primary hover:underline">
                  {resetUrl}
                </a>
              </p>
              <p className="text-xs text-muted-foreground">En producción, este enlace se enviaría por email.</p>
            </AlertDescription>
          </Alert>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          autoComplete="email"
        />
      </div>

      <Button type="submit" className="w-full gap-2" disabled={isLoading}>
        <Mail className="h-4 w-4" />
        {isLoading ? "Enviando..." : "Enviar Enlace de Recuperación"}
      </Button>

      <Alert>
        <AlertDescription className="text-xs">
          Por seguridad, no revelamos si un email existe en nuestro sistema. Si el email está registrado, recibirás
          instrucciones para restablecer tu contraseña.
        </AlertDescription>
      </Alert>
    </form>
  )
}
