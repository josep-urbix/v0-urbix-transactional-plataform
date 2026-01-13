"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TaskType {
  id: string
  nombre: string
  tipo: string
}

interface Process {
  id: string
  nombre: string
}

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateTaskDialog({ open, onOpenChange, onSuccess }: CreateTaskDialogProps) {
  const [loading, setLoading] = useState(false)
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [processes, setProcesses] = useState<Process[]>([])
  const [loadingProcesses, setLoadingProcesses] = useState(false)
  const [formData, setFormData] = useState({
    tipo: "",
    titulo: "",
    descripcion: "",
    prioridad: "MEDIA",
    proceso: "",
    cuenta_virtual_id: "",
    payment_account_id: "",
  })

  useEffect(() => {
    loadTaskTypes()
    loadProcesses()
  }, [])

  const loadTaskTypes = async () => {
    try {
      setLoadingTypes(true)
      const response = await fetch("/api/admin/tasks/types")
      if (!response.ok) throw new Error("Error al cargar tipos")
      const data = await response.json()
      setTaskTypes(data)
    } catch (error) {
      console.error("Error loading task types:", error)
    } finally {
      setLoadingTypes(false)
    }
  }

  const loadProcesses = async () => {
    try {
      setLoadingProcesses(true)
      const response = await fetch("/api/admin/tasks/processes")
      if (!response.ok) throw new Error("Error al cargar procesos")
      const data = await response.json()
      setProcesses(data)
    } catch (error) {
      console.error("Error loading processes:", error)
    } finally {
      setLoadingProcesses(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        payment_account_id: formData.payment_account_id ? Number.parseInt(formData.payment_account_id) : undefined,
        cuenta_virtual_id: formData.cuenta_virtual_id || undefined,
      }

      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        onSuccess()
        onOpenChange(false)
        setFormData({
          tipo: "",
          titulo: "",
          descripcion: "",
          prioridad: "MEDIA",
          proceso: "",
          cuenta_virtual_id: "",
          payment_account_id: "",
        })
      } else {
        const error = await res.json()
        alert(error.error || "Error al crear tarea")
      }
    } catch (error) {
      console.error("Error creating task:", error)
      alert("Error al crear tarea")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear Nueva Tarea</DialogTitle>
          <DialogDescription>Crea una tarea manual vinculada a un proceso y objeto específico</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Tarea *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                disabled={loadingTypes}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingTypes ? "Cargando..." : "Seleccionar tipo"} />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((type) => (
                    <SelectItem key={type.id} value={type.tipo}>
                      {type.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prioridad">Prioridad *</Label>
              <Select
                value={formData.prioridad}
                onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BAJA">Baja</SelectItem>
                  <SelectItem value="MEDIA">Media</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="CRITICA">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="proceso">Proceso *</Label>
            <Select
              value={formData.proceso}
              onValueChange={(value) => setFormData({ ...formData, proceso: value })}
              disabled={loadingProcesses}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingProcesses ? "Cargando..." : "Seleccionar proceso"} />
              </SelectTrigger>
              <SelectContent>
                {processes.map((process) => (
                  <SelectItem key={process.id} value={process.id}>
                    {process.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Revisar vinculación de cuenta virtual"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Describe la tarea en detalle..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cuenta_virtual_id">ID Cuenta Virtual (opcional)</Label>
              <Input
                id="cuenta_virtual_id"
                value={formData.cuenta_virtual_id}
                onChange={(e) => setFormData({ ...formData, cuenta_virtual_id: e.target.value })}
                placeholder="UUID de cuenta virtual"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_account_id">ID Payment Account (opcional)</Label>
              <Input
                id="payment_account_id"
                type="number"
                value={formData.payment_account_id}
                onChange={(e) => setFormData({ ...formData, payment_account_id: e.target.value })}
                placeholder="ID de wallet"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
