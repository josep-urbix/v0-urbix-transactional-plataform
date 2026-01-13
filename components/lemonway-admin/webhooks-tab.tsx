"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Webhook {
  id: string
  event_type: string
  url: string
  is_active: boolean
  created_at: string
}

export function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchWebhooks = async () => {
      try {
        const res = await fetch("/api/admin/lemonway/webhooks-sim")
        const data = await res.json()
        if (data.success) {
          setWebhooks(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching webhooks:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWebhooks()
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>Configura y simula eventos de Lemonway</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <Input placeholder="URL del webhook" />
            <select className="border rounded px-3 py-2 bg-background">
              <option>Selecciona evento</option>
              <option>wallet.created</option>
              <option>wallet.updated</option>
              <option>transaction.completed</option>
              <option>transaction.failed</option>
            </select>
            <Button>Simular Webhook</Button>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-4">Webhooks configurados</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{w.event_type}</TableCell>
                    <TableCell className="text-sm">{w.url}</TableCell>
                    <TableCell>
                      <Badge className={w.is_active ? "bg-green-600" : "bg-gray-600"}>
                        {w.is_active ? "Activo" : "Inactivo"}
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
