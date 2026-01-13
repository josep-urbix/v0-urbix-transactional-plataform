"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Search, Monitor, Smartphone, Tablet, Shield, ShieldOff } from "lucide-react"

interface Device {
  id: string
  user_id: string
  user_email: string
  user_name: string
  device_type: string
  device_name: string
  browser: string
  os: string
  is_trusted: boolean
  last_used_at: string
  created_at: string
}

export function InvestorDevicesList() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [stats, setStats] = useState({ total: 0, trusted: 0, untrusted: 0 })

  const fetchDevices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)

      console.log("[v0] Fetching devices from API...")
      const res = await fetch(`/api/admin/investors/devices?${params}`)
      console.log("[v0] API response status:", res.status)

      const data = await res.json()
      console.log("[v0] API response data:", data)

      setDevices(data.devices || [])
      setStats(data.stats || { total: 0, trusted: 0, untrusted: 0 })

      console.log("[v0] Devices set:", data.devices?.length || 0)
    } catch (error) {
      console.error("[v0] Error fetching devices:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDevices()
  }, [search])

  const getDeviceIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "mobile":
        return <Smartphone className="h-4 w-4" />
      case "tablet":
        return <Tablet className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dispositivos</h1>
          <p className="text-muted-foreground">Dispositivos registrados de inversores</p>
        </div>
        <Button onClick={fetchDevices} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">De Confianza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {stats.trusted}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">No Confianza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500 flex items-center gap-2">
              <ShieldOff className="h-5 w-5" />
              {stats.untrusted}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispositivos</CardTitle>
          <CardDescription>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email o nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Navegador / SO</TableHead>
                <TableHead>Último Uso</TableHead>
                <TableHead>Registrado</TableHead>
                <TableHead>Confianza</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay dispositivos
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{device.user_name || "Sin nombre"}</div>
                        <div className="text-sm text-muted-foreground">{device.user_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.device_type)}
                        <span>{device.device_name || device.device_type || "Desconocido"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{device.browser || "Desconocido"}</div>
                      <div className="text-xs text-muted-foreground">{device.os || "Desconocido"}</div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(device.last_used_at)}</TableCell>
                    <TableCell className="text-sm">{formatDate(device.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant={device.is_trusted ? "default" : "secondary"}>
                        {device.is_trusted ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
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
