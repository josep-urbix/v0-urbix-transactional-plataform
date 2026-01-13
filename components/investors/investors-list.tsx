"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, UserCheck, UserX, Shield, Search, RefreshCw, Eye, MoreHorizontal, Mail, Wallet } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface InvestorUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  status: string
  kyc_status: string
  kyc_level: number
  two_factor_enabled: boolean
  google_id?: string
  apple_id?: string
  email_verified: boolean
  created_at: string
  last_login_at?: string
  active_sessions: number
  linked_wallets: number
}

interface Stats {
  users: {
    total_users: number
    active_users: number
    pending_users: number
    suspended_users: number
    blocked_users: number
    users_with_2fa: number
    users_with_google: number
    users_with_apple: number
    kyc_approved: number
    new_last_24h: number
    active_last_24h: number
  }
  sessions: {
    total_sessions: number
    active_sessions: number
  }
  wallets: {
    verified_links: number
  }
  logins: {
    last_24h: number
  }
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending_verification: "bg-yellow-100 text-yellow-800",
  suspended: "bg-orange-100 text-orange-800",
  blocked: "bg-red-100 text-red-800",
  deleted: "bg-gray-100 text-gray-800",
}

const statusLabels: Record<string, string> = {
  active: "Activo",
  pending_verification: "Pendiente",
  suspended: "Suspendido",
  blocked: "Bloqueado",
  deleted: "Eliminado",
}

const kycColors: Record<string, string> = {
  none: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-orange-100 text-orange-800",
}

const kycLabels: Record<string, string> = {
  none: "Sin KYC",
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  expired: "Expirado",
}

export function InvestorsList() {
  const [investors, setInvestors] = useState<InvestorUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [kycFilter, setKycFilter] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetchInvestors()
    fetchStats()
  }, [page, statusFilter, kycFilter])

  async function fetchInvestors() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      if (kycFilter) params.set("kyc_status", kycFilter)
      params.set("page", page.toString())
      params.set("limit", "25")

      const res = await fetch(`/api/admin/investors?${params}`)
      const data = await res.json()

      setInvestors(data.investors || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      console.error("Error fetching investors:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/investors-stats")
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  function handleSearch() {
    setPage(1)
    fetchInvestors()
  }

  function formatDate(dateString?: string) {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats?.users?.total_users || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Activos</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats?.users?.active_users || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats?.users?.pending_users || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Con 2FA</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats?.users?.users_with_2fa || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">KYC Aprobado</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats?.users?.kyc_approved || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-600" />
              <span className="text-sm text-muted-foreground">Nuevos 24h</span>
            </div>
            <p className="text-2xl font-bold text-cyan-600">{stats?.users?.new_last_24h || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Buscar por email o nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="pending_verification">Pendiente</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={kycFilter}
              onValueChange={(v) => {
                setKycFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="KYC" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos KYC</SelectItem>
                <SelectItem value="none">Sin KYC</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                fetchInvestors()
                fetchStats()
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inversores</CardTitle>
          <CardDescription>
            Mostrando {investors.length} de {total} inversores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>KYC</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>Sesiones</TableHead>
                <TableHead>Wallets</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : investors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No se encontraron inversores
                  </TableCell>
                </TableRow>
              ) : (
                investors.map((investor) => (
                  <TableRow key={investor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {investor.display_name ||
                            `${investor.first_name || ""} ${investor.last_name || ""}`.trim() ||
                            "-"}
                        </p>
                        <p className="text-sm text-muted-foreground">{investor.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[investor.status]}>{statusLabels[investor.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={kycColors[investor.kyc_status]}>
                        {kycLabels[investor.kyc_status]}
                        {investor.kyc_level > 0 && ` (${investor.kyc_level})`}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {investor.email_verified && (
                          <Mail className="h-4 w-4 text-green-600" title="Email verificado" />
                        )}
                        {investor.two_factor_enabled && <Shield className="h-4 w-4 text-blue-600" title="2FA activo" />}
                        {investor.google_id && (
                          <span className="text-xs bg-red-100 text-red-800 px-1 rounded" title="Google">
                            G
                          </span>
                        )}
                        {investor.apple_id && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-1 rounded" title="Apple">
                            A
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{investor.active_sessions}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{investor.linked_wallets}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(investor.created_at)}</TableCell>
                    <TableCell className="text-sm">{formatDate(investor.last_login_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/investors/${investor.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalle
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
