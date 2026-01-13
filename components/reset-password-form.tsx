"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react"

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error("Token de recuperación no encontrado")
      router.push("/forgot-password")
    }
  }, [token, router])

  const validatePassword = (password: string) => {
    const errors: string[] = []
    if (password.length < 8) {
      errors.push("Al menos 8 caracteres")
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Una letra mayúscula")
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Una letra minúscula")
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Un número")
    }
    return errors
  }

  const passwordErrors = password ? validatePassword(password) : []
  const passwordsMatch = password && confirmPassword && password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error("Token no válido")
      return
    }

    if (passwordErrors.length > 0) {
      toast.error("La contraseña no cumple con los requisitos de seguridad")
      return
    }

    if (!passwordsMatch) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al restablecer contraseña")
      }

      toast.success("Contraseña restablecida exitosamente")
      router.push("/login")
    } catch (error: any) {
      console.error("[v0] Reset password error:", error)
      toast.error(error.message || "Error al restablecer contraseña")
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nueva Contraseña</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ingresa tu nueva contraseña"
          required
          disabled={isLoading}
          autoComplete="new-password"
        />
        {password && passwordErrors.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1 mt-2">
            <p className="font-medium">La contraseña debe contener:</p>
            <ul className="space-y-1">
              {passwordErrors.map((error, idx) => (
                <li key={idx} className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
        {password && passwordErrors.length === 0 && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            La contraseña cumple con los requisitos
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirma tu nueva contraseña"
          required
          disabled={isLoading}
          autoComplete="new-password"
        />
        {confirmPassword && !passwordsMatch && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Las contraseñas no coinciden
          </p>
        )}
        {confirmPassword && passwordsMatch && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Las contraseñas coinciden
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading || passwordErrors.length > 0 || !passwordsMatch}
        className="w-full gap-2"
      >
        <KeyRound className="h-4 w-4" />
        {isLoading ? "Restableciendo..." : "Restablecer Contraseña"}
      </Button>

      <Alert>
        <AlertDescription className="text-xs">
          El enlace de recuperación expira en 1 hora. Si no lo usas a tiempo, deberás solicitar uno nuevo.
        </AlertDescription>
      </Alert>
    </form>
  )
}
