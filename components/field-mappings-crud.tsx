"use client"

import { useState, useMemo } from "react"
import useSWR, { mutate } from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Pencil, Trash2, Plus } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface FieldMapping {
  id: number
  endpoint: string
  table_name: string
  field_name: string
  field_value: string
  label: string
  target_field?: string
  color?: string
  created_at: string
  updated_at: string
}

interface DBSchema {
  tables: Record<string, { schema: string; columns: string[] }>
}

export default function FieldMappingsCrud() {
  const { data: mappings, error } = useSWR("/api/lemonway/field-mappings", fetcher, {
    refreshInterval: 0,
  })

  const { data: dbSchema } = useSWR<DBSchema>("/api/lemonway/db-schema", fetcher)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<FieldMapping | null>(null)
  const [formData, setFormData] = useState({
    endpoint: "",
    tableName: "",
    field: "",
    payloadValue: "",
    label: "",
    targetField: "",
    color: "",
  })
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const availableColumns = useMemo(() => {
    if (!dbSchema || !formData.tableName) return []
    return dbSchema.tables[formData.tableName]?.columns || []
  }, [dbSchema, formData.tableName])

  const handleOpenDialog = (mapping?: FieldMapping) => {
    if (mapping) {
      setEditingMapping(mapping)
      setFormData({
        endpoint: mapping.endpoint,
        tableName: mapping.table_name,
        field: mapping.field_name,
        payloadValue: mapping.field_value,
        label: mapping.label,
        targetField: mapping.target_field || "",
        color: mapping.color || "",
      })
    } else {
      setEditingMapping(null)
      setFormData({
        endpoint: "",
        tableName: "",
        field: "",
        payloadValue: "",
        label: "",
        targetField: "",
        color: "",
      })
    }
    setIsDialogOpen(true)
    setMessage(null)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingMapping(null)
    setFormData({
      endpoint: "",
      tableName: "",
      field: "",
      payloadValue: "",
      label: "",
      targetField: "",
      color: "",
    })
    setMessage(null)
  }

  const handleSave = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const url = "/api/lemonway/field-mappings"
      const method = editingMapping ? "PUT" : "POST"
      const body = editingMapping
        ? {
            id: editingMapping.id,
            endpoint: formData.endpoint,
            tableName: formData.tableName,
            fieldName: formData.field,
            fieldValue: formData.payloadValue,
            label: formData.label,
            targetField: formData.targetField || null,
            color: formData.color || null,
          }
        : {
            endpoint: formData.endpoint,
            tableName: formData.tableName,
            fieldName: formData.field,
            fieldValue: formData.payloadValue,
            label: formData.label,
            targetField: formData.targetField || null,
            color: formData.color || null,
          }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({
          type: "success",
          text: editingMapping ? "Mapeo actualizado correctamente" : "Mapeo creado correctamente",
        })
        mutate("/api/lemonway/field-mappings")
        setTimeout(() => handleCloseDialog(), 1500)
      } else {
        setMessage({ type: "error", text: data.error || "Error al guardar el mapeo" })
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este mapeo?")) {
      return
    }

    try {
      const response = await fetch(`/api/lemonway/field-mappings?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        mutate("/api/lemonway/field-mappings")
      } else {
        const data = await response.json()
        alert(data.error || "Error al eliminar el mapeo")
      }
    } catch (error: any) {
      alert(error.message)
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error al cargar los mapeos de campos</AlertDescription>
      </Alert>
    )
  }

  if (!mappings) {
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Mapeos de Campos</h3>
          <p className="text-sm text-muted-foreground">
            Configura las etiquetas para los valores de los campos del payload de Lemonway
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Mapeo
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Endpoint</TableHead>
              <TableHead>Tabla</TableHead>
              <TableHead>Campo</TableHead>
              <TableHead>Valor Payload</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead>Campo Destino</TableHead>
              <TableHead>Color</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No hay mapeos configurados
                </TableCell>
              </TableRow>
            ) : (
              mappings.map((mapping: FieldMapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="font-mono text-sm text-muted-foreground">{mapping.id}</TableCell>
                  <TableCell className="font-mono text-sm">{mapping.endpoint}</TableCell>
                  <TableCell className="font-mono text-sm">{mapping.table_name}</TableCell>
                  <TableCell className="font-mono text-sm">{mapping.field_name}</TableCell>
                  <TableCell className="font-mono text-sm">{mapping.field_value}</TableCell>
                  <TableCell>{mapping.label}</TableCell>
                  <TableCell className="font-mono text-sm">{mapping.target_field || "-"}</TableCell>
                  <TableCell>
                    {mapping.color ? (
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor:
                            mapping.color === "green" ? "#dcfce7" : mapping.color === "red" ? "#fee2e2" : "#fef3c7",
                          color:
                            mapping.color === "green" ? "#166534" : mapping.color === "red" ? "#991b1b" : "#854d0e",
                        }}
                      >
                        {mapping.color}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(mapping)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(mapping.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMapping ? "Editar Mapeo" : "Nuevo Mapeo"}</DialogTitle>
            <DialogDescription>
              Configura la etiqueta que se mostrará en la interfaz para un valor específico del payload
            </DialogDescription>
          </DialogHeader>

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="endpoint">Endpoint</Label>
              <Input
                id="endpoint"
                placeholder="accounts/retrieve"
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Endpoint de la API (ej: accounts/retrieve, transactions/list)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableName">Tabla</Label>
              <Select
                value={formData.tableName}
                onValueChange={(value) => setFormData({ ...formData, tableName: value, field: "" })}
              >
                <SelectTrigger id="tableName">
                  <SelectValue placeholder="Selecciona una tabla" />
                </SelectTrigger>
                <SelectContent>
                  {dbSchema &&
                    Object.keys(dbSchema.tables).map((tableName) => (
                      <SelectItem key={tableName} value={tableName}>
                        {tableName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Tabla de la base de datos donde se guarda este campo</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="field">Campo</Label>
              <Select
                value={formData.field}
                onValueChange={(value) => setFormData({ ...formData, field: value })}
                disabled={!formData.tableName}
              >
                <SelectTrigger id="field">
                  <SelectValue
                    placeholder={formData.tableName ? "Selecciona un campo" : "Primero selecciona una tabla"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((columnName) => (
                    <SelectItem key={columnName} value={columnName}>
                      {columnName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Campo de la tabla donde se guarda este valor</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payloadValue">Valor Payload</Label>
              <Input
                id="payloadValue"
                placeholder="1"
                value={formData.payloadValue}
                onChange={(e) => setFormData({ ...formData, payloadValue: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Valor que viene en el payload (ej: 0, 1, 2)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Etiqueta</Label>
              <Input
                id="label"
                placeholder="Prestamista"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Etiqueta legible que se mostrará en la interfaz</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetField">Campo Destino (Opcional)</Label>
              <Select
                value={formData.targetField || "sameField"} // Updated default value to be non-empty string
                onValueChange={(value) => setFormData({ ...formData, targetField: value })}
                disabled={!formData.tableName}
              >
                <SelectTrigger id="targetField">
                  <SelectValue placeholder="Mismo campo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sameField">Mismo campo</SelectItem> // Updated value to be non-empty string
                  {availableColumns.map((columnName) => (
                    <SelectItem key={columnName} value={columnName}>
                      {columnName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Si quieres que la etiqueta aparezca en un campo diferente, selecciónalo aquí
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color (Opcional)</Label>
              <Select
                value={formData.color || "noColor"} // Updated default value to be non-empty string
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger id="color">
                  <SelectValue placeholder="Sin color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noColor">Sin color</SelectItem> // Updated value to be non-empty string
                  <SelectItem value="green">Verde</SelectItem>
                  <SelectItem value="red">Rojo</SelectItem>
                  <SelectItem value="yellow">Amarillo</SelectItem>
                  <SelectItem value="blue">Azul</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Color de fondo para la etiqueta</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
