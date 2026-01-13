"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface OperationType {
  id: string
  code: string
  name: string
  direction: string
  description?: string
  active: boolean
  lemonway_transaction_type?: string
  lemonway_direction?: string
  lemonway_payment_method?: string
}

export function OperationTypesManager() {
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    direction: "+",
    description: "",
    lemonway_transaction_type: "",
    lemonway_direction: "",
    lemonway_payment_method: "",
  })

  useEffect(() => {
    fetchOperationTypes()
  }, [])

  const fetchOperationTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/virtual-accounts/operation-types")
      if (!response.ok) throw new Error("Error al cargar tipos de operación")

      const data = await response.json()
      setOperationTypes(data)
    } catch (error) {
      console.error("Error fetching operation types:", error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      direction: "+",
      description: "",
      lemonway_transaction_type: "",
      lemonway_direction: "",
      lemonway_payment_method: "",
    })
    setEditingId(null)
  }

  const handleEdit = (type: OperationType) => {
    setFormData({
      code: type.code,
      name: type.name,
      direction: type.direction,
      description: type.description || "",
      lemonway_transaction_type: type.lemonway_transaction_type || "",
      lemonway_direction: type.lemonway_direction || "",
      lemonway_payment_method: type.lemonway_payment_method || "",
    })
    setEditingId(type.id)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingId
        ? `/api/admin/virtual-accounts/operation-types/${editingId}`
        : "/api/admin/virtual-accounts/operation-types"

      const method = editingId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error(`Error al ${editingId ? "actualizar" : "crear"} tipo de operación`)

      await fetchOperationTypes()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error:", error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/virtual-accounts/operation-types/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Error al eliminar tipo de operación")

      await fetchOperationTypes()
      setDeleteId(null)
    } catch (error) {
      console.error("Error deleting:", error)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="border-b border-[#E6E6E6]">
          <div className="flex justify-between items-center">
            <CardTitle className="text-[#164AA6]">Tipos de Operación</CardTitle>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open)
                if (!open) resetForm()
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-[#164AA6] hover:bg-[#164AA6]/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Editar" : "Crear"} Tipo de Operación</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Código *</label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Nombre *</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Dirección Saldo *</label>
                      <select
                        value={formData.direction}
                        onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                        className="w-full border border-[#E6E6E6] rounded-md px-3 py-2"
                      >
                        <option value="+">Crédito (+)</option>
                        <option value="-">Débito (-)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Dirección Lemonway</label>
                      <select
                        value={formData.lemonway_direction}
                        onChange={(e) => setFormData({ ...formData, lemonway_direction: e.target.value })}
                        className="w-full border border-[#E6E6E6] rounded-md px-3 py-2"
                      >
                        <option value="">-- Seleccionar --</option>
                        <option value="money_in">money_in</option>
                        <option value="money_out">money_out</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tipos Lemonway (separados por coma)</label>
                    <Input
                      value={formData.lemonway_transaction_type}
                      onChange={(e) => setFormData({ ...formData, lemonway_transaction_type: e.target.value })}
                      placeholder="Ej: 1,13,19"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Métodos de Pago</label>
                    <Input
                      value={formData.lemonway_payment_method}
                      onChange={(e) => setFormData({ ...formData, lemonway_payment_method: e.target.value })}
                      placeholder="Ej: CARD,BANK_TRANSFER,IDEAL"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Descripción</label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-[#164AA6] hover:bg-[#164AA6]/90">
                    {editingId ? "Actualizar" : "Crear"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-[#777777]">Cargando tipos de operación...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dirección</TableHead>
                    <TableHead>Tipos LW</TableHead>
                    <TableHead>Dir. LW</TableHead>
                    <TableHead>Métodos Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-[#777777] py-8">
                        No hay tipos de operación configurados
                      </TableCell>
                    </TableRow>
                  ) : (
                    operationTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-mono text-sm">{type.code}</TableCell>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell>
                          <Badge variant={type.direction === "+" ? "default" : "destructive"}>
                            {type.direction === "+" ? "Crédito" : "Débito"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{type.lemonway_transaction_type || "-"}</TableCell>
                        <TableCell className="text-xs">{type.lemonway_direction || "-"}</TableCell>
                        <TableCell className="text-xs">{type.lemonway_payment_method || "-"}</TableCell>
                        <TableCell>
                          <Badge className={type.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {type.active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(type)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setDeleteId(type.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirmar eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este tipo de operación? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-500 hover:bg-red-600">
            Eliminar
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
