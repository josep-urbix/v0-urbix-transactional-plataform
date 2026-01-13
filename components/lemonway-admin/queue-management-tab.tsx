"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface QueueItem {
  id: string
  priority: "URGENT" | "NORMAL"
  status: string
  endpoint: string
  http_method: string
  retry_count: number
  max_retries: number
  error_message?: string
  created_at: string
}

export function QueueManagementTab() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const statusParam = filter !== "all" ? `&status=${filter}` : ""
        const res = await fetch(`/api/admin/lemonway/queue?limit=100${statusParam}`)
        const data = await res.json()
        if (data.success) {
          setQueue(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching queue:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQueue()
  }, [filter])

  const handlePrioritize = async (id: string) => {
    try {
      const res = await fetch("/api/admin/lemonway/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "prioritize", queue_ids: [id] }),
      })
      if (res.ok) {
        setQueue(queue.map((item) => (item.id === id ? { ...item, priority: "URGENT" } : item)))
      }
    } catch (error) {
      console.error("Error prioritizing:", error)
    }
  }

  const getPriorityBadge = (priority: string) => {
    if (priority === "URGENT") {
      return <Badge className="bg-red-600">URGENTE</Badge>
    }
    return <Badge className="bg-blue-600">Normal</Badge>
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-gray-500",
      processing: "bg-yellow-500",
      completed: "bg-green-500",
      failed: "bg-red-500",
    }
    return <Badge className={variants[status] || "bg-gray-500"}>{status}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Cola</CardTitle>
        <CardDescription>Sistema FIFO dual con priorización URGENTE/NORMAL</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="processing">En proceso</SelectItem>
              <SelectItem value="completed">Completadas</SelectItem>
              <SelectItem value="failed">Fallidas</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            Actualizar
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prioridad</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Reintentos</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No hay items en la cola
                  </TableCell>
                </TableRow>
              ) : (
                queue.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                    <TableCell className="font-mono text-sm">{item.endpoint}</TableCell>
                    <TableCell>{item.http_method}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      {item.retry_count}/{item.max_retries}
                    </TableCell>
                    <TableCell className="text-sm">{new Date(item.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrioritize(item.id)}
                        disabled={item.priority === "URGENT"}
                      >
                        Priorizar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
