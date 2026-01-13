"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"

interface TempMovimientosActionsProps {
  movimientoId: string
  onSuccess?: () => void
  onEdit?: () => void
}

export function TempMovimientosActions({ movimientoId, onSuccess, onEdit }: TempMovimientosActionsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const handleApprove = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/lemonway/movimientos/${movimientoId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      })

      if (!response.ok) throw new Error("Error al aprobar")

      toast({
        title: "Aprobado",
        description: "El movimiento ha sido aprobado",
      })
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/lemonway/movimientos/${movimientoId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          motivo_rechazo: rejectReason,
        }),
      })

      if (!response.ok) throw new Error("Error al rechazar")

      toast({
        title: "Rechazado",
        description: "El movimiento ha sido rechazado",
      })
      setRejectDialogOpen(false)
      setRejectReason("")
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onEdit} title="Editar">
          <Edit className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700"
          onClick={handleApprove}
          disabled={loading}
          title="Aprobar"
        >
          <CheckCircle className="h-4 w-4" />
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={() => setRejectDialogOpen(true)}
          disabled={loading}
          title="Rechazar"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Movimiento</AlertDialogTitle>
            <AlertDialogDescription>Por favor indica el motivo del rechazo</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Textarea
              placeholder="Motivo del rechazo..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={loading || !rejectReason}>
              {loading ? "Rechazando..." : "Rechazar"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
