"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"

interface AccountDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  account: any
  onDeleted: () => void
}

export function AccountDeleteDialog({ isOpen, onClose, account, onDeleted }: AccountDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!account) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/lemonway/accounts/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: account.id }),
      })

      if (!res.ok) throw new Error("Failed to delete account")

      onDeleted()
      onClose()
    } catch (error) {
      console.error("Delete error:", error)
      alert("Error al eliminar la solicitud")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar solicitud</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar la solicitud {account?.request_reference}? Esta acción no se puede
            deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3 justify-end">
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
