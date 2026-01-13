"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Search, Activity, LogIn, LogOut, Settings, Key, Mail } from "lucide-react"

interface ActivityLog {
  id: string
  user_id: string
  user_email: string
  user_name: string
  action: string
  details: Record<string, unknown>
  ip_address: string
  user_agent: string
  created_at: string
}

const actionIcons: Record<string, React.ReactNode> = {
  login: <LogIn className="h-4 w-4 text-green-600" />,
  logout: <LogOut className="h-4 w-4 text-gray-600" />,
  password_change: <Key className="h-4 w-4 text-yellow-600" />,
  email_change: <Mail className="h-4 w-4 text-blue-600" />,
  settings_update: <Settings className="h-4 w-4 text-purple-600" />,
  "2fa_enabled": <Key className="h-4 w-4 text-green-600" />,
  "2fa_disabled": <Key className="h-4 w-4 text-red-600" />,
}

const actionLabels: Record<string, string> = {
  login: "Inicio de sesión",
  logout: "Cierre de sesión",
  password_change: "Cambio de contraseña",
  email_change: "Cambio de email",
  settings_update: "Actualización de perfil",
  "2fa_enabled": "2FA activado",
  "2fa_disabled": "2FA desactivado",
  magic_link_request: "Solicitud Magic Link",
  magic_link_used: "Magic Link usado",
}

export function InvestorActivityList() {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [stats, setStats] = useState({ total: 0, today: 0, logins: 0 })

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (actionFilter !== "all") params.append("action", actionFilter)
      const res = await fetch(`/api/admin/investors/activity?${params}`)
      const data = await res.json()
      setActivities(data.activities || [])
      setStats(data.stats || { total: 0, today: 0, logins: 0 })
    } catch (error) {
      console.error("Error fetching activities:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [search, actionFilter])

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Actividad</h1>
          <p className="text-muted-foreground">Registro de actividad de inversores</p>
        </div>
        <Button onClick={fetchActivities} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {stats.total}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.today}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Logins (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.logins}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de Actividad</CardTitle>
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
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <SelectItem value="login">Inicio de sesión</SelectItem>
                  <SelectItem value="logout">Cierre de sesión</SelectItem>
                  <SelectItem value="password_change">Cambio contraseña</SelectItem>
                  <SelectItem value="2fa_enabled">2FA activado</SelectItem>
                  <SelectItem value="2fa_disabled">2FA desactivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay actividad registrada
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="text-sm font-mono">{formatDate(activity.created_at)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{activity.user_name || "Sin nombre"}</div>
                        <div className="text-sm text-muted-foreground">{activity.user_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {actionIcons[activity.action] || <Activity className="h-4 w-4" />}
                        <Badge variant="outline">{actionLabels[activity.action] || activity.action}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{activity.ip_address || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {activity.details ? JSON.stringify(activity.details) : "-"}
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
