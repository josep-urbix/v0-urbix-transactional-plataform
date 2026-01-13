"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AvailableMethodsTab } from "./available-methods-tab"

interface CustomQuery {
  id: string
  name: string
  method: string
  endpoint: string
  request_template: string
  created_at: string
}

export function CustomQueriesTab() {
  const [queries, setQueries] = useState<CustomQuery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newQuery, setNewQuery] = useState({ name: "", method: "GET", endpoint: "", template: "{}" })
  const [showAvailableMethods, setShowAvailableMethods] = useState(false)

  useEffect(() => {
    const fetchQueries = async () => {
      try {
        const res = await fetch("/api/admin/lemonway/custom-queries")
        const data = await res.json()
        if (data.success) {
          setQueries(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching queries:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQueries()
  }, [])

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/admin/lemonway/custom-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQuery),
      })
      if (res.ok) {
        const data = await res.json()
        setQueries([...queries, data.data])
        setNewQuery({ name: "", method: "GET", endpoint: "", template: "{}" })
      }
    } catch (error) {
      console.error("Error creating query:", error)
    }
  }

  return (
    <div className="space-y-6">
      {showAvailableMethods ? (
        <>
          <Button onClick={() => setShowAvailableMethods(false)}>← Volver a Queries Personalizadas</Button>
          <AvailableMethodsTab />
        </>
      ) : (
        <>
          <Button onClick={() => setShowAvailableMethods(true)}>Ver Métodos Disponibles</Button>
          <Card>
            <CardHeader>
              <CardTitle>Queries Personalizadas</CardTitle>
              <CardDescription>Crea presets de las queries disponibles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <Input
                  placeholder="Nombre de la query"
                  value={newQuery.name}
                  onChange={(e) => setNewQuery({ ...newQuery, name: e.target.value })}
                />
                <select
                  value={newQuery.method}
                  onChange={(e) => setNewQuery({ ...newQuery, method: e.target.value })}
                  className="border rounded px-3 py-2 bg-background"
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
                <Input
                  placeholder="/endpoint"
                  value={newQuery.endpoint}
                  onChange={(e) => setNewQuery({ ...newQuery, endpoint: e.target.value })}
                />
                <Textarea
                  placeholder="Request template"
                  value={newQuery.template}
                  onChange={(e) => setNewQuery({ ...newQuery, template: e.target.value })}
                />
                <Button onClick={handleCreate}>Crear Query</Button>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold mb-4">Queries guardadas</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queries.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell>{q.name}</TableCell>
                        <TableCell>
                          <Badge>{q.method}</Badge>
                        </TableCell>
                        <TableCell>{q.endpoint}</TableCell>
                        <TableCell>
                          <Button variant="sm" size="sm">
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
