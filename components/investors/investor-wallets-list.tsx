"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Search, Wallet, Link2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface WalletLink {
  id: string
  user_id: string
  user_email: string
  user_name: string
  lemonway_wallet_id: string
  wallet_status: string
  is_primary: boolean
  linked_at: string
  verified_at: string | null
  cuenta_virtual_id: string
  payer_or_beneficiary?: number
}

interface Task {
  id: string
  titulo: string
  prioridad: string
  estado: string
  tipo: string
  fecha_creacion: string
}

export function InvestorWalletsList() {
  const [wallets, setWallets] = useState<WalletLink[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [stats, setStats] = useState({ total: 0, verified: 0, primary: 0 })
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [walletTasks, setWalletTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  const fetchWallets = async () => {
    setLoading(true)
    console.log("[v0] Frontend: Starting to fetch wallets, search:", search)
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      const url = `/api/admin/investors/wallets?${params}`
      console.log("[v0] Frontend: Fetching from URL:", url)

      const res = await fetch(url)
      console.log("[v0] Frontend: Response status:", res.status, res.statusText)

      const data = await res.json()
      console.log("[v0] Frontend: Received data:", data)
      console.log("[v0] Frontend: Wallets count:", data.wallets?.length || 0)
      console.log("[v0] Frontend: Stats:", data.stats)

      setWallets(data.wallets || [])
      setStats(data.stats || { total: 0, verified: 0, primary: 0 })
    } catch (error) {
      console.error("[v0] Frontend: Error fetching wallets:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchWalletTasks = async (paymentAccountId: number) => {
    setLoadingTasks(true)
    try {
      const res = await fetch(
        `/api/admin/tasks?objeto_tipo=payment_account&objeto_id=${paymentAccountId}&estado=PENDIENTE,EN_PROGRESO`,
      )
      const data = await res.json()
      setWalletTasks(data.tasks || [])
    } catch (error) {
      console.error("Error fetching wallet tasks:", error)
    } finally {
      setLoadingTasks(false)
    }
  }

  useEffect(() => {
    fetchWallets()
  }, [search])

  const formatDate = (date: string | null) => {
    if (!date) return "-"
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: string; className: string }> = {
      CRITICA: { variant: "destructive", className: "" },
      ALTA: { variant: "default", className: "bg-orange-500" },
      MEDIA: { variant: "default", className: "bg-yellow-500" },
      BAJA: { variant: "default", className: "bg-green-500" },
    }
    const config = variants[priority] || { variant: "secondary", className: "" }
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {priority}
      </Badge>
    )
  }

  const getPayerBeneficiaryBadge = (value?: number) => {
    if (value === undefined || value === null) return "-"
    if (value === 1)
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700">
          Pagador
        </Badge>
      )
    if (value === 2)
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700">
          Beneficiario
        </Badge>
      )
    return "-"
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Wallets Vinculados</h1>
          <p className="text-muted-foreground">Wallets Lemonway vinculados a inversores</p>
        </div>
        <Button onClick={fetchWallets} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vinculaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              {stats.total}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Primarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.primary}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallets Vinculados</CardTitle>
          <CardDescription>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email, nombre o wallet ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Wallet ID</TableHead>
                  <TableHead>ID Cuenta Virtual</TableHead>
                  <TableHead>Estado Wallet</TableHead>
                  <TableHead>Vinculado</TableHead>
                  <TableHead>Verificado</TableHead>
                  <TableHead>Tipo Wallet</TableHead>
                  <TableHead>Tareas</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : wallets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No hay wallets vinculados
                    </TableCell>
                  </TableRow>
                ) : (
                  wallets.map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{wallet.user_name || "Sin nombre"}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">{wallet.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{wallet.lemonway_wallet_id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-muted-foreground">
                          {wallet.cuenta_virtual_id ? wallet.cuenta_virtual_id.slice(0, 8) + "..." : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            wallet.wallet_status === "active"
                              ? "default"
                              : wallet.wallet_status === "blocked"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {wallet.wallet_status || "Desconocido"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(wallet.linked_at)}</TableCell>
                      <TableCell className="text-sm">
                        {wallet.verified_at ? (
                          <Badge variant="outline" className="text-green-600">
                            {formatDate(wallet.verified_at)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Pendiente</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {wallet.is_primary ? (
                          <Badge>Primario</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Secundario</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">-</span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/payment-accounts?search=${wallet.lemonway_wallet_id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedWallet} onOpenChange={() => setSelectedWallet(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tareas del Wallet {selectedWallet}</DialogTitle>
            <DialogDescription>Tareas pendientes y en progreso asociadas a este wallet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingTasks ? (
              <div className="text-center py-8">Cargando tareas...</div>
            ) : walletTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No hay tareas asociadas</div>
            ) : (
              <div className="space-y-2">
                {walletTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getPriorityBadge(task.prioridad)}
                        <Badge variant="outline">{task.estado}</Badge>
                        <span className="text-sm text-muted-foreground">{task.tipo}</span>
                      </div>
                      <h4 className="font-medium">{task.titulo}</h4>
                      <p className="text-sm text-muted-foreground">Creada: {formatDate(task.fecha_creacion)}</p>
                    </div>
                    <Link href={`/dashboard/tasks/view/${task.id}`}>
                      <Button variant="outline" size="sm">
                        Ver Detalles
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
