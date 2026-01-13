"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"

interface Task {
  id: string
  titulo: string
  tipo: string
  cuenta_virtual_id: string | null
}

interface CompleteTaskDialogProps {
  task?: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CompleteTaskDialog({ task, open, onOpenChange, onSuccess }: CompleteTaskDialogProps) {
  const [loading, setLoading] = useState(false)
  const [notas, setNotas] = useState("")
  const [desbloquear, setDesbloquear] = useState(false)

  if (!task) {
    return null
  }

  // Show unblock option for tasks related to blocked virtual accounts
  const showUnblockOption = task.tipo.includes("VINCULACION") || task.cuenta_virtual_id

  const handleComplete = async () => {
    if (!notas.trim()) {
      alert("Las notas son obligatorias para completar una tarea")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notas,
          desbloquear_cuenta: desbloquear,
        }),
      })

      if (res.ok) {
        onSuccess()
        onOpenChange(false)
        setNotas("")
        setDesbloquear(false)
      } else {
        const error = await res.json()
        alert(error.error || "Error al completar tarea")
      }
    } catch (error) {
      console.error("Error completing task:", error)
      alert("Error al completar tarea")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Completar Tarea</DialogTitle>
          <DialogDescription>{task.titulo}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notas">Notas de Resolución *</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Describe cómo se resolvió la tarea, acciones tomadas, etc."
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground">Las notas son obligatorias para completar una tarea</p>
          </div>

          {showUnblockOption && (
            <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted">
              <Checkbox
                id="desbloquear"
                checked={desbloquear}
                onCheckedChange={(checked) => setDesbloquear(checked as boolean)}
              />
              <div className="flex-1">
                <Label htmlFor="desbloquear" className="font-medium cursor-pointer">
                  Desbloquear cuenta virtual asociada
                </Label>
                <p className="text-xs text-muted-foreground">
                  Si esta tarea bloqueó la cuenta virtual, se desbloqueará automáticamente
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleComplete} disabled={loading || !notas.trim()} className="w-full sm:w-auto">
            {loading ? "Completando..." : desbloquear ? "Completar y Desbloquear" : "Completar Tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
