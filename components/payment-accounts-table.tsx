"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, RefreshCw, Wallet, TrendingUp, UserCheck, AlertCircle, Eye, Download } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { PaymentAccount, PaymentAccountStats } from "@/lib/types/payment-account"
import { PaymentAccountDetailsDialog } from "@/components/payment-account-details-dialog"
import useSWR from "swr"
import { formatCurrency } from "@/lib/utils/currency"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface FieldMapping {
  id: number
  endpoint: string
  table_name: string
  field_name: string
  field_value: string
  label: string
  target_field?: string | null
  color?: string | null
}

interface PaymentAccountsTableProps {
  initialAccounts: PaymentAccount[]
  initialStats: PaymentAccountStats | null
}

const PaymentAccountsTableComponent = function PaymentAccountsTable({
  initialAccounts,
  initialStats,
}: PaymentAccountsTableProps) {
  const [accounts, setAccounts] = useState<any[]>(initialAccounts)
  const [stats, setStats] = useState<any>(initialStats)
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showSyncDialog, setShowSyncDialog] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<PaymentAccount | null>(null)
  const [syncingAll, setSyncingAll] = useState(false)
  const [showSyncByIdDialog, setShowSyncByIdDialog] = useState(false)
  const [syncingById, setSyncingById] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<PaymentAccount | null>(null)
  const [isMultipleSyncing, setIsMultipleSyncing] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [showMultipleSyncDialog, setShowMultipleSyncDialog] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const { data: fieldMappings = [] } = useSWR<FieldMapping[]>("/api/lemonway/field-mappings", fetcher)

  const [syncStartId, setSyncStartId] = useState("")
  const [syncEndId, setSyncEndId] = useState("")

  const [formData, setFormData] = useState({
    accountId: "",
    email: "",
    status: "active" as "active" | "blocked" | "closed",
    balance: 0,
    currency: "EUR",
    firstName: "",
    lastName: "",
    companyName: "",
    phoneNumber: "",
    mobileNumber: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  })

  const [syncEmail, setSyncEmail] = useState("")
  const [syncAccountId, setSyncAccountId] = useState("")

  const getFieldLabel = (fieldName: string, fieldValue: any): { label: string; color?: string } => {
    if (!fieldMappings || fieldMappings.length === 0) return { label: String(fieldValue) }

    const normalizeTableName = (name: string) => name.replace(/^[^.]+\./, "")
    const normalizedMappings: Record<string, Record<string, Record<string, { label: string; color?: string }>>> = {}

    fieldMappings.forEach((mapping) => {
      const table = normalizeTableName(mapping.table_name)
      if (!normalizedMappings[table]) normalizedMappings[table] = {}
      if (!normalizedMappings[table][mapping.field_name]) normalizedMappings[table][mapping.field_name] = {}
      normalizedMappings[table][mapping.field_name][String(mapping.field_value)] = {
        label: mapping.label,
        color: mapping.color || undefined,
      }
    })

    const mapping = normalizedMappings["payment_accounts"]?.[fieldName]?.[String(fieldValue)]
    return mapping || { label: String(fieldValue) }
  }

  const getColorClasses = (color?: string) => {
    if (!color) return "bg-gray-100 text-gray-800"

    const colorMap: Record<string, string> = {
      green: "bg-green-100 text-green-800 border-green-200",
      red: "bg-red-100 text-red-800 border-red-200",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200",
      orange: "bg-orange-100 text-orange-800 border-orange-200",
      purple: "bg-purple-100 text-purple-800 border-purple-200",
    }

    return colorMap[color.toLowerCase()] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  useEffect(() => {
    fetchAccounts()
  }, [statusFilter])

  const fetchAccounts = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)

      const response = await fetch(`/api/payment-accounts?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch payment accounts")

      const data = await response.json()
      setAccounts(data.accounts || [])
      setStats(data.stats)
    } catch (error) {
      console.error("[v0] Fetch payment accounts error:", error)
      toast.error("Error al cargar cuentas de pago")
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.accountId || !formData.email) {
      toast.error("Account ID y Email son requeridos")
      return
    }

    try {
      const response = await fetch("/api/payment-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      toast.success("Cuenta de pago creada exitosamente")
      setShowCreateDialog(false)
      resetForm()
      fetchAccounts()
    } catch (error: any) {
      toast.error(error.message || "Error al crear cuenta de pago")
    }
  }

  const handleUpdate = async () => {
    if (!selectedAccount) {
      console.log("[v0] handleUpdate: No selectedAccount")
      return
    }

    console.log("[v0] handleUpdate called")
    setIsUpdating(true)

    try {
      console.log("[v0] Updating payment account:", selectedAccount.accountId)
      console.log("[v0] Form data being sent:", JSON.stringify(formData, null, 2))

      const response = await fetch(`/api/payment-accounts/${selectedAccount.accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      console.log("[v0] Response status:", response.status)
      const responseData = await response.json()
      console.log("[v0] Response data:", JSON.stringify(responseData, null, 2))

      if (!response.ok) {
        throw new Error(responseData.error || "Error al actualizar")
      }

      toast.success("Cuenta de pago actualizada exitosamente")
      setShowEditDialog(false)
      setSelectedAccount(null)
      resetForm()
      fetchAccounts()
    } catch (error: any) {
      console.error("[v0] Update error:", error)
      toast.error(error.message || "Error al actualizar cuenta de pago")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSync = async () => {
    if (!syncEmail && !syncAccountId) {
      toast.error("Email o Account ID es requerido para sincronizar")
      return
    }

    setSyncingById(true)
    try {
      const response = await fetch("/api/payment-accounts/sync-by-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: syncEmail, accountId: syncAccountId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const result = await response.json()
      toast.success(`${result.synced} cuenta(s) sincronizada(s) exitosamente`)
      setShowSyncByIdDialog(false)
      setSyncEmail("")
      setSyncAccountId("")
      fetchAccounts()
    } catch (error: any) {
      toast.error(error.message || "Error al sincronizar cuenta")
    } finally {
      setSyncingById(false)
    }
  }

  const handleMultipleSync = async () => {
    const start = Number.parseInt(syncStartId)
    const end = Number.parseInt(syncEndId)

    if (isNaN(start) || isNaN(end) || start > end) {
      toast.error("IDs de inicio y fin inválidos")
      return
    }

    setIsMultipleSyncing(true)

    try {
      const response = await fetch("/api/payment-accounts/sync-range", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startId: start, endId: end }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const result = await response.json()
      toast.success(result.message)

      setShowMultipleSyncDialog(false)
      setSyncStartId("")
      setSyncEndId("")

      setTimeout(() => {
        fetchAccounts()
      }, 2000)
    } catch (error: any) {
      toast.error(error.message || "Error al encolar sincronización múltiple")
    } finally {
      setIsMultipleSyncing(false)
    }
  }

  const handleSyncAll = async () => {
    toast.error(
      "Lemonway API no permite listar todas las cuentas sin especificar IDs. Use 'Sincronizar por ID' en su lugar.",
    )
  }

  const openEditDialog = (account: PaymentAccount) => {
    setSelectedAccount(account)
    setFormData({
      accountId: account.accountId,
      email: account.email || "",
      status: account.status,
      balance: account.balance,
      currency: account.currency,
      firstName: account.firstName || "",
      lastName: account.lastName || "",
      companyName: account.companyName || "",
      phoneNumber: account.phoneNumber || "",
      mobileNumber: account.mobileNumber || "",
      address: account.address || "",
      city: account.city || "",
      postalCode: account.postalCode || "",
      country: account.country || "",
    })
    setShowEditDialog(true)
  }

  const openDetailsDialog = (account: PaymentAccount) => {
    setSelectedAccountForDetails(account)
    setShowDetailsDialog(true)
  }

  const resetForm = () => {
    setFormData({
      accountId: "",
      email: "",
      status: "active",
      balance: 0,
      currency: "EUR",
      firstName: "",
      lastName: "",
      companyName: "",
      phoneNumber: "",
      mobileNumber: "",
      address: "",
      city: "",
      postalCode: "",
      country: "",
    })
  }

  if (loading) {
    return <div className="text-center py-8">Cargando cuentas de pago...</div>
  }

  return (
    <>
      {stats && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cuentas</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAccounts}</div>
              <p className="text-xs text-muted-foreground">{stats.byAccountType?.personaFisica || 0} Persona Física</p>
              <p className="text-xs text-muted-foreground">
                {stats.byAccountType?.personaJuridica || 0} Persona Jurídica
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</div>
              <p className="text-xs text-muted-foreground">{formatCurrency(stats.averageBalance)} promedio</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byKycStatus.validated} KYC 2</div>
              <p className="text-xs text-muted-foreground">{stats.byKycStatus.pending} KYC 1</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cuentas Suspendidas</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">{stats.byBlockedStatus?.blocked || 0}</div>
                <p className="text-xs text-muted-foreground">Bloqueadas por Lemonway</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stats.byBlockedStatus?.closed || 0} Cerradas</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4">
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="blocked">Bloqueada</SelectItem>
                <SelectItem value="closed">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowSyncByIdDialog(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar por ID
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cuenta
            </Button>
            <Button onClick={() => setShowMultipleSyncDialog(true)} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Sincronización Múltiple por ID
            </Button>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account ID</TableHead>
                <TableHead>Titular</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Última Sincronización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!accounts || accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay cuentas de pago registradas
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-sm">{account.accountId}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        {account.companyName ? (
                          <span>{account.companyName}</span>
                        ) : (
                          <span>
                            {account.firstName} {account.lastName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{account.email}</TableCell>
                    <TableCell className="text-sm text-right">
                      <div className="flex flex-col items-end">
                        <span>{formatCurrency(account.balance)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        const { label, color } = getFieldLabel("status", account.status)
                        return (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColorClasses(color)}`}
                          >
                            {label}
                          </span>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {account.lastSyncAt
                        ? format(new Date(account.lastSyncAt), "dd/MM/yyyy HH:mm", { locale: es })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => openDetailsDialog(account)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(account)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Cuenta de Pago</DialogTitle>
            <DialogDescription>Ingrese los datos de la nueva cuenta de pago</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-accountId">Account ID *</Label>
              <Input
                id="create-accountId"
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-firstName">Nombre</Label>
              <Input
                id="create-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-lastName">Apellidos</Label>
              <Input
                id="create-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="create-companyName">Empresa</Label>
              <Input
                id="create-companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-phoneNumber">Teléfono</Label>
              <Input
                id="create-phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-mobileNumber">Móvil</Label>
              <Input
                id="create-mobileNumber"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="create-address">Dirección</Label>
              <Input
                id="create-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-city">Ciudad</Label>
              <Input
                id="create-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-postalCode">Código Postal</Label>
              <Input
                id="create-postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-country">País</Label>
              <Input
                id="create-country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-status">Estado</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                <SelectTrigger id="create-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="blocked">Bloqueada</SelectItem>
                  <SelectItem value="closed">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Crear Cuenta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronizar desde Lemonway</DialogTitle>
            <DialogDescription>Buscar y sincronizar una cuenta desde Lemonway API</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sync-email">Email</Label>
              <Input
                id="sync-email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={syncEmail}
                onChange={(e) => setSyncEmail(e.target.value)}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">O</div>
            <div className="space-y-2">
              <Label htmlFor="sync-accountId">Account ID</Label>
              <Input
                id="sync-accountId"
                placeholder="Ej: 105"
                value={syncAccountId}
                onChange={(e) => setSyncAccountId(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSyncByIdDialog} onOpenChange={setShowSyncByIdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronizar Cuenta por ID</DialogTitle>
            <DialogDescription>
              Ingrese el Account ID o Email de la cuenta que desea sincronizar desde Lemonway
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sync-accountId">Account ID</Label>
              <Input
                id="sync-accountId"
                placeholder="Ej: 104, 112"
                value={syncAccountId}
                onChange={(e) => setSyncAccountId(e.target.value)}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">o</div>
            <div className="space-y-2">
              <Label htmlFor="sync-email">Email</Label>
              <Input
                id="sync-email"
                type="email"
                placeholder="Ej: user@example.com"
                value={syncEmail}
                onChange={(e) => setSyncEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSyncByIdDialog(false)} disabled={syncingById}>
              Cancelar
            </Button>
            <Button onClick={handleSync} disabled={syncingById || (!syncEmail && !syncAccountId)}>
              {syncingById && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              {syncingById ? "Sincronizando..." : "Sincronizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Cuenta de Pago</DialogTitle>
            <DialogDescription>Modificar los datos de la cuenta de pago</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-accountId">Account ID</Label>
              <Input id="edit-accountId" value={formData.accountId} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">Nombre</Label>
              <Input
                id="edit-firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Apellidos</Label>
              <Input
                id="edit-lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-companyName">Empresa</Label>
              <Input
                id="edit-companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phoneNumber">Teléfono</Label>
              <Input
                id="edit-phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-mobileNumber">Móvil</Label>
              <Input
                id="edit-mobileNumber"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-address">Dirección</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">Ciudad</Label>
              <Input
                id="edit-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-postalCode">Código Postal</Label>
              <Input
                id="edit-postalCode"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-country">País</Label>
              <Input
                id="edit-country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Estado</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as any })}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="blocked">Bloqueada</SelectItem>
                  <SelectItem value="closed">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentAccountDetailsDialog
        account={selectedAccountForDetails}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />

      <Dialog open={showMultipleSyncDialog} onOpenChange={setShowMultipleSyncDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronización Múltiple por ID</DialogTitle>
            <DialogDescription>Sincronizar un rango de cuentas desde Lemonway (máximo 100 cuentas)</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sync-start-id">ID Inicial</Label>
                <Input
                  id="sync-start-id"
                  placeholder="Ej: 100"
                  value={syncStartId}
                  onChange={(e) => setSyncStartId(e.target.value)}
                  disabled={isMultipleSyncing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sync-end-id">ID Final</Label>
                <Input
                  id="sync-end-id"
                  placeholder="Ej: 150"
                  value={syncEndId}
                  onChange={(e) => setSyncEndId(e.target.value)}
                  disabled={isMultipleSyncing}
                />
              </div>
            </div>

            {isMultipleSyncing && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground text-center">Sincronizando... Por favor espere.</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMultipleSyncDialog(false)} disabled={isMultipleSyncing}>
              Cancelar
            </Button>
            <Button onClick={handleMultipleSync} disabled={isMultipleSyncing}>
              {isMultipleSyncing ? "Sincronizando..." : "Sincronizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PaymentAccountsTableComponent
export { PaymentAccountsTableComponent as PaymentAccountsTable }
