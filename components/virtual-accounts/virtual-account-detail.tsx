"use client"

import type React from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Movement {
  id: string
  movement_type: string
  operation_type_code: string
  operation_type_name: string
  operation_direction: string
  amount: string
  balance_after: string
  executed_at: string
  reference?: string
  description?: string
  fecha: string
  tipo_codigo: string
  descripcion: string
  origen: string
  importe: string
  saldo_disponible_resultante: string
  lemonway_transaction_id: string
}

interface Account {
  id: string
  account_number: string
  balance: string
  status: string
  created_at: string
  owner_data?: {
    email: string
    name?: string
  }
}

interface OperationType {
  id: string
  code: string
  name: string
  direction: string
}

export function VirtualAccountDetail({ accountId }: { accountId: string }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    operation_type_code: "",
    amount: "",
    reference: "",
    description: "",
  })

  useEffect(() => {
    fetchAccountDetails()
    fetchOperationTypes()
  }, [accountId])

  const fetchAccountDetails = async () => {
    try {
      setLoading(true)
      const [accountRes, movementsRes] = await Promise.all([
        fetch(`/api/admin/virtual-accounts/accounts/${accountId}`),
        fetch(`/api/admin/virtual-accounts/accounts/${accountId}/movements`),
      ])

      if (!accountRes.ok) {
        const errorData = await accountRes.json()
        throw new Error(errorData.error || "Error al cargar cuenta")
      }
      if (!movementsRes.ok) {
        const errorData = await movementsRes.json()
        throw new Error(errorData.error || "Error al cargar movimientos")
      }

      const accountData = await accountRes.json()
      const movementsData = await movementsRes.json()

      setAccount(accountData)
      setMovements(movementsData.data || [])
    } catch (error) {
      console.error("Error fetching account details:", error)
      setAccount(null)
      setMovements([])
    } finally {
      setLoading(false)
    }
  }

  const fetchOperationTypes = async () => {
    try {
      const res = await fetch("/api/admin/virtual-accounts/operation-types")
      if (!res.ok) throw new Error("Error al cargar tipos de operación")
      const data = await res.json()
      setOperationTypes(data.operation_types || [])
    } catch (error) {
      console.error("Error fetching operation types:", error)
    }
  }

  const handleCreateMovement = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.operation_type_code || !formData.amount) {
      alert("Por favor completa los campos requeridos")
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/admin/virtual-accounts/accounts/${accountId}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation_type_code: formData.operation_type_code,
          amount: Number.parseFloat(formData.amount),
          reference: formData.reference || undefined,
          description: formData.description || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al crear movimiento")
      }

      setFormData({
        operation_type_code: "",
        amount: "",
        reference: "",
        description: "",
      })
      setIsDialogOpen(false)

      fetchAccountDetails()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "frozen":
        return "bg-blue-100 text-blue-800"
      case "closed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/virtual-accounts">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Cuentas
        </Button>
      </Link>

      <Card>
        <CardHeader className="border-b border-[#E6E6E6]">
          <div className="flex justify-between items-center">
            <CardTitle className="text-[#164AA6]">Detalle de Cuenta Virtual</CardTitle>
            <Badge className={getStatusColor(account?.status || "")}>{account?.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-[#777777]">Número de Cuenta</div>
              <div className="text-lg font-mono font-semibold">{account?.account_number}</div>
            </div>
            <div>
              <div className="text-sm text-[#777777]">Balance Actual</div>
              <div className="text-lg font-mono font-semibold text-[#164AA6]">
                {Number.parseFloat(account?.balance || "0").toFixed(2)} EUR
              </div>
            </div>
            <div>
              <div className="text-sm text-[#777777]">Propietario</div>
              <div className="font-medium">{account?.owner_data?.name || "Sin nombre"}</div>
              <div className="text-sm text-[#777777]">{account?.owner_data?.email}</div>
            </div>
            <div>
              <div className="text-sm text-[#777777]">Fecha de Creación</div>
              <div>{new Date(account?.created_at || "").toLocaleString()}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-[#E6E6E6]">
          <div className="flex justify-between items-center">
            <CardTitle className="text-[#164AA6]">Historial de Movimientos</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#164AA6] hover:bg-[#0FB7EA] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Movimiento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-[#164AA6]">Crear Movimiento</DialogTitle>
                  <DialogDescription>Registra una nueva transacción en esta cuenta virtual</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateMovement} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="operation_type">Tipo de Operación *</Label>
                    <Select
                      value={formData.operation_type_code}
                      onValueChange={(value) => setFormData({ ...formData, operation_type_code: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {operationTypes.map((type) => (
                          <SelectItem key={type.id} value={type.code}>
                            <div className="flex items-center gap-2">
                              <span>{type.name}</span>
                              <Badge
                                variant="outline"
                                className={type.direction === "credit" ? "text-green-600" : "text-red-600"}
                              >
                                {type.direction === "credit" ? "Crédito" : "Débito"}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto (EUR) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">Referencia</Label>
                    <Input
                      id="reference"
                      placeholder="REF-001"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea
                      id="description"
                      placeholder="Descripción del movimiento..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="bg-[#164AA6] hover:bg-[#0FB7EA] text-white"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Creando..." : "Crear Movimiento"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Referencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        No hay movimientos registrados en esta cuenta
                      </AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{new Date(movement.fecha).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.tipo_codigo || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{movement.descripcion}</div>
                      <div className="text-sm text-[#777777]">{movement.origen}</div>
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono ${movement.importe.startsWith("-") ? "text-red-600" : "text-green-600"}`}
                    >
                      {!movement.importe.startsWith("-") ? "+" : ""}
                      {Number.parseFloat(movement.importe).toFixed(2)} EUR
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number.parseFloat(movement.saldo_disponible_resultante || "0").toFixed(2)} EUR
                    </TableCell>
                    <TableCell className="text-sm text-[#777777]">{movement.lemonway_transaction_id || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
