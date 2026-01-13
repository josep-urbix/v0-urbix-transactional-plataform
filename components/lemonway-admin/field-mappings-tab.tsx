"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface FieldMapping {
  id: string
  source_field: string
  target_field: string
  transformation: string
}

export function FieldMappingsTab() {
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newMapping, setNewMapping] = useState({ source: "", target: "", transform: "none" })

  useEffect(() => {
    const fetchMappings = async () => {
      try {
        const res = await fetch("/api/admin/lemonway/field-mappings")
        const data = await res.json()
        if (data.success) {
          setMappings(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching mappings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMappings()
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapeos de Campos</CardTitle>
          <CardDescription>Configura transformaciones de datos entre sistemas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <Input
              placeholder="Campo origen"
              value={newMapping.source}
              onChange={(e) => setNewMapping({ ...newMapping, source: e.target.value })}
            />
            <Input
              placeholder="Campo destino"
              value={newMapping.target}
              onChange={(e) => setNewMapping({ ...newMapping, target: e.target.value })}
            />
            <select
              value={newMapping.transform}
              onChange={(e) => setNewMapping({ ...newMapping, transform: e.target.value })}
              className="border rounded px-3 py-2 bg-background"
            >
              <option value="none">Sin transformación</option>
              <option value="uppercase">Mayúsculas</option>
              <option value="lowercase">Minúsculas</option>
              <option value="trim">Recortar espacios</option>
            </select>
            <Button>Crear Mapeo</Button>
          </div>

          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Transformación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.source_field}</TableCell>
                    <TableCell>{m.target_field}</TableCell>
                    <TableCell>{m.transformation}</TableCell>
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
