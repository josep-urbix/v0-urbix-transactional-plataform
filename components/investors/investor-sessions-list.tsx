"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RefreshCw, Search, Monitor, Smartphone, Tablet, X } from "lucide-react"

interface Session {
  id: string
  user_id: string
  user_email: string
  user_name: string
  device_info: {
    device_type?: string
    device_name?: string
    browser?: string
    os?: string
  } | null
  user_agent: string | null
  ip_address: string
  is_active: boolean
  created_at: string
  last_activity_at: string
  expires_at: string
}

export function InvestorSessionsList() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0 })

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (showAll) params.append("showAll", "true")
      const res = await fetch(`/api/admin/investors/sessions?${params}`)
      const data = await res.json()
      setSessions(data.sessions || [])
      setStats(data.stats || { total: 0, active: 0, expired: 0 })
    } catch (error) {
      console.error("Error fetching sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [search, showAll])

  const revokeSession = async (sessionId: string) => {
    if (!confirm("¿Revocar esta sesión?")) return
    try {
      await fetch(`/api/admin/investors/sessions/${sessionId}`, { method: "DELETE" })
      fetchSessions()
    } catch (error) {
      console.error("Error revoking session:", error)
    }
  }

  const getDeviceIcon = (deviceInfo: Session["device_info"], userAgent: string | null) => {
    const type = deviceInfo?.device_type?.toLowerCase() || ""
    const ua = userAgent?.toLowerCase() || ""

    if (type === "mobile" || ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
      return <Smartphone className="h-4 w-4" />
    }
    if (type === "tablet" || ua.includes("ipad") || ua.includes("tablet")) {
      return <Tablet className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  const getDeviceInfo = (deviceInfo: Session["device_info"], userAgent: string | null) => {
    if (deviceInfo?.browser || deviceInfo?.os) {
      return {
        browser: deviceInfo.browser || "Desconocido",
        os: deviceInfo.os || "Desconocido",
      }
    }

    // Parse user agent
    if (userAgent) {
      let browser = "Desconocido"
      let os = "Desconocido"

      if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari"
      else if (userAgent.includes("Chrome")) browser = "Chrome"
      else if (userAgent.includes("Firefox")) browser = "Firefox"
      else if (userAgent.includes("Edge")) browser = "Edge"

      if (userAgent.includes("iPhone")) os = "iOS"
      else if (userAgent.includes("iPad")) os = "iPadOS"
      else if (userAgent.includes("Mac OS")) os = "macOS"
      else if (userAgent.includes("Windows")) os = "Windows"
      else if (userAgent.includes("Android")) os = "Android"
      else if (userAgent.includes("Linux")) os = "Linux"

      return { browser, os }
    }

    return { browser: "Desconocido", os: "Desconocido" }
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

  const isExpired = (session: Session) => {
    return !session.is_active || new Date(session.expires_at) <= new Date()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#164AA6" }}>
            Sesiones de Inversores
          </h1>
          <p className="text-muted-foreground">Gestión de sesiones activas del portal de inversores</p>
        </div>
        <Button onClick={fetchSessions} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sesiones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sesiones</CardTitle>
          <CardDescription>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email o nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="show-all" checked={showAll} onCheckedChange={setShowAll} />
                <Label htmlFor="show-all" className="text-sm cursor-pointer">
                  Mostrar sesiones expiradas
                </Label>
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
                <TableHead>IP</TableHead>
                <TableHead>Última Actividad</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {showAll ? "No hay sesiones" : "No hay sesiones activas"}
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session) => {
                  const deviceDetails = getDeviceInfo(session.device_info, session.user_agent)
                  const expired = isExpired(session)

                  return (
                    <TableRow key={session.id} className={expired ? "opacity-60" : ""}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.user_name || "Sin nombre"}</div>
                          <div className="text-sm text-muted-foreground">{session.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(session.device_info, session.user_agent)}
                          <div>
                            <div className="text-sm">{deviceDetails.browser}</div>
                            <div className="text-xs text-muted-foreground">{deviceDetails.os}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{session.ip_address || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {session.last_activity_at ? formatDate(session.last_activity_at) : "-"}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(session.expires_at)}</TableCell>
                      <TableCell>
                        <Badge variant={expired ? "secondary" : "default"} className={!expired ? "bg-green-600" : ""}>
                          {expired ? "Expirada" : "Activa"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!expired && (
                          <Button variant="ghost" size="sm" onClick={() => revokeSession(session.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
