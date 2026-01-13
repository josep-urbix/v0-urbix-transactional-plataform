"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface OperationType {
  id: string
  code: string
  name: string
  default_priority: "URGENT" | "NORMAL"
  created_at: string
}

export function OperationTypesTab() {
  const [operations, setOperations] = useState<OperationType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newOp, setNewOp] = useState({ code: "", name: "", priority: "NORMAL" })

  useEffect(() => {
    const fetchOperations = async () => {
      try {
        const res = await fetch("/api/admin/lemonway/operation-types")
        const data = await res.json()
        if (data.success) {
          setOperations(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching operations:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOperations()
  }, [])

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/admin/lemonway/operation-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOp),
      })
      if (res.ok) {
        const data = await res.json()
        setOperations([...operations, data.data])
        setNewOp({ code: "", name: "", priority: "NORMAL" })
      }
    } catch (error) {
      console.error("Error creating operation:", error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Operación</CardTitle>
          <CardDescription>Gestiona tipos de transacción y su prioridad por defecto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <Input
              placeholder="Código"
              value={newOp.code}
              onChange={(e) => setNewOp({ ...newOp, code: e.target.value })}
            />
            <Input
              placeholder="Nombre"
              value={newOp.name}
              onChange={(e) => setNewOp({ ...newOp, name: e.target.value })}
            />
            <select
              value={newOp.priority}
              onChange={(e) => setNewOp({ ...newOp, priority: e.target.value })}
              className="border rounded px-3 py-2 bg-background"
            >
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgente</option>
            </select>
            <Button onClick={handleCreate}>Crear Tipo</Button>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-4">Tipos configurados</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Prioridad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>{op.code}</TableCell>
                    <TableCell>{op.name}</TableCell>
                    <TableCell>
                      <Badge className={op.default_priority === "URGENT" ? "bg-red-600" : "bg-blue-600"}>
                        {op.default_priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
