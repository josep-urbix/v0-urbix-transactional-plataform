"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface TempMovimiento {
  id: string
  monto: number
  commission: number
  descripcion: string
  comentario: string
  referencia_externa: string
  tipo_transaccion: string
}

interface EditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  movimiento: TempMovimiento | null
  onSuccess?: () => void
}

export function TempMovimientosEditDialog({ open, onOpenChange, movimiento, onSuccess }: EditDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<TempMovimiento>>({})

  const handleSave = async () => {
    if (!movimiento) return

    try {
      setLoading(true)
      const response = await fetch(`/api/lemonway/movimientos/${movimiento.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          campos_editados: formData,
        }),
      })

      if (!response.ok) throw new Error("Error al guardar cambios")

      toast({
        title: "Movimiento actualizado",
        description: "Los cambios han sido guardados",
      })

      onOpenChange(false)
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

  if (!movimiento) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Movimiento</DialogTitle>
          <DialogDescription>Realiza cambios en los campos del movimiento</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="monto">Monto</Label>
            <Input
              id="monto"
              type="number"
              step="0.01"
              defaultValue={movimiento.monto}
              onChange={(e) => setFormData({ ...formData, monto: Number.parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="commission">Comisión</Label>
            <Input
              id="commission"
              type="number"
              step="0.01"
              defaultValue={movimiento.commission}
              onChange={(e) => setFormData({ ...formData, commission: Number.parseFloat(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción</Label>
            <Textarea
              id="descripcion"
              defaultValue={movimiento.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="comentario">Comentario</Label>
            <Textarea
              id="comentario"
              defaultValue={movimiento.comentario}
              onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="referencia_externa">Referencia Externa</Label>
            <Input
              id="referencia_externa"
              defaultValue={movimiento.referencia_externa}
              onChange={(e) => setFormData({ ...formData, referencia_externa: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
