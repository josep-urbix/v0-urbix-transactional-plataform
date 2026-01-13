"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle, CheckCircle } from "lucide-react"

interface AccountSubmitDialogProps {
  isOpen: boolean
  onClose: () => void
  account: any
  onSubmitted: () => void
}

export function AccountSubmitDialog({ isOpen, onClose, account, onSubmitted }: AccountSubmitDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/admin/lemonway/accounts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: account.id }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Error al procesar la solicitud")
      }

      setSuccess(true)
      setTimeout(() => {
        onSubmitted()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{success ? "Solicitud Procesada" : "Procesar Solicitud"}</DialogTitle>
          <DialogDescription>
            {success
              ? "La solicitud ha sido enviada a Lemonway exitosamente"
              : `¿Deseas procesar la solicitud ${account?.request_reference}?`}
          </DialogDescription>
        </DialogHeader>

        {success && (
          <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-900">Procesada correctamente</p>
              {account?.lemonway_wallet_id && (
                <p className="text-xs text-green-700 mt-1">ID de Cartera: {account.lemonway_wallet_id}</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!success && (
          <div className="space-y-3 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="font-medium text-blue-900">Información de la solicitud:</p>
              <p className="text-blue-700 mt-1">
                {account?.first_name} {account?.last_name}
              </p>
              <p className="text-blue-600 text-xs">{account?.email}</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          {!success && (
            <>
              <Button variant="outline" className="flex-1 bg-transparent" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Procesando..." : "Procesar"}
              </Button>
            </>
          )}
          {success && (
            <Button className="w-full" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
