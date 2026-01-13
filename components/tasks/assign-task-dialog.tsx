"use client"

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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Task {
  id: string
  titulo: string
  asignado_a: string | null
}

interface User {
  id: string
  email: string
  name: string | null
}

interface AssignTaskDialogProps {
  task: Task | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AssignTaskDialog({ task, open, onOpenChange, onSuccess }: AssignTaskDialogProps) {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string>("")

  useEffect(() => {
    if (open) {
      fetchUsers()
    }
  }, [open])

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users") // changed from /api/admin/users to /api/users
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || data) // handle both { users: [...] } and direct array formats
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  const handleAssign = async () => {
    if (!selectedUser) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tasks/${task?.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asignado_a: selectedUser }),
      })

      if (res.ok) {
        onSuccess()
        onOpenChange(false)
      } else {
        const error = await res.json()
        alert(error.error || "Error al asignar tarea")
      }
    } catch (error) {
      console.error("Error assigning task:", error)
      alert("Error al asignar tarea")
    } finally {
      setLoading(false)
    }
  }

  if (!task) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar Tarea</DialogTitle>
          <DialogDescription>{task.titulo}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user">Asignar a:</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleAssign} disabled={loading || !selectedUser}>
            {loading ? "Asignando..." : "Asignar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
