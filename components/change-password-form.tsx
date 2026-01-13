"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react"

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

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

  const passwordErrors = newPassword ? validatePassword(newPassword) : []
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setShowSuccess(false)

    if (passwordErrors.length > 0) {
      toast.error("La contraseña no cumple con los requisitos de seguridad")
      setIsLoading(false)
      return
    }

    if (!passwordsMatch) {
      toast.error("Las contraseñas nuevas no coinciden")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al cambiar la contraseña")
      }

      toast.success("Contraseña actualizada exitosamente")
      setShowSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      // Hide success message after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000)
    } catch (error: any) {
      console.error("[v0] Change password error:", error)
      toast.error(error.message || "Error al cambiar la contraseña")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {showSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Tu contraseña ha sido actualizada exitosamente
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="current-password">Contraseña Actual</Label>
        <Input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Ingresa tu contraseña actual"
          required
          disabled={isLoading}
          autoComplete="current-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password">Nueva Contraseña</Label>
        <Input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Ingresa tu nueva contraseña"
          required
          disabled={isLoading}
          autoComplete="new-password"
        />
        {newPassword && passwordErrors.length > 0 && (
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
        {newPassword && passwordErrors.length === 0 && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            La contraseña cumple con los requisitos
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
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

      <Button type="submit" disabled={isLoading || passwordErrors.length > 0 || !passwordsMatch} className="gap-2">
        <KeyRound className="h-4 w-4" />
        {isLoading ? "Actualizando..." : "Cambiar Contraseña"}
      </Button>

      <Alert>
        <AlertDescription className="text-xs">
          Asegúrate de usar una contraseña fuerte que incluya letras mayúsculas, minúsculas, números y tenga al menos 8
          caracteres.
        </AlertDescription>
      </Alert>
    </form>
  )
}
