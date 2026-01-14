"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Eye, Edit2, Trash2, Search, Send } from "lucide-react"
import { AccountDetailsModal } from "./account-details-modal"
import { AccountDeleteDialog } from "./account-delete-dialog"
import { AccountSubmitDialog } from "./account-submit-dialog"

interface AccountRequest {
  id: string
  request_reference: string
  status: string
  validation_status: string
  first_name: string
  last_name: string
  email: string
  lemonway_wallet_id?: string
  profile_type: string
  created_at: string
  updated_at: string
}

interface AccountsListTabProps {
  onSelectRequest?: (requestId: string) => void
  selectedRequestId?: string | null
}

function AccountsListTab({ onSelectRequest, selectedRequestId }: AccountsListTabProps) {
  const [accounts, setAccounts] = useState<AccountRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)

  const [selectedAccount, setSelectedAccount] = useState<AccountRequest | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState<AccountRequest | null>(null)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [submittingAccount, setSubmittingAccount] = useState<AccountRequest | null>(null)

  const limit = 50

  const fetchAccounts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("page", String(page))
      params.append("limit", String(limit))
      if (search) params.append("search", search)
      if (status !== "all") params.append("status", status)

      const res = await fetch(`/api/admin/lemonway/accounts/list?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setAccounts(data.data)
        setTotal(data.pagination.total)
        setPages(data.pagination.pages)
      }
    } catch (error) {
      console.error("[v0] Error fetching accounts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [page, search, status])

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-500",
      SUBMITTED: "bg-blue-500",
      "KYC-1 Completo": "bg-yellow-500",
      "KYC-2 Completo": "bg-green-500",
      INVALID: "bg-red-500",
      REJECTED: "bg-red-600",
      CANCELLED: "bg-gray-600",
    }
    return <Badge className={colors[status] || "bg-gray-500"}>{status}</Badge>
  }

  const getValidationBadge = (validation_status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-gray-400",
      VALID: "bg-green-400",
      INVALID: "bg-red-400",
    }
    return (
      <Badge variant="outline" className={colors[validation_status] || "bg-gray-400"}>
        {validation_status}
      </Badge>
    )
  }

  const handleViewDetails = (account: AccountRequest) => {
    setSelectedAccount(account)
    setShowDetailsModal(true)
  }

  const handleEdit = (account: AccountRequest) => {
    if (account.status !== "DRAFT") {
      alert("Solo se pueden editar solicitudes en estado DRAFT")
      return
    }
    if (onSelectRequest) {
      onSelectRequest(account.id)
    }
  }

  const handleDelete = (account: AccountRequest) => {
    if (account.status !== "DRAFT") {
      alert("Solo se pueden eliminar solicitudes en estado DRAFT")
      return
    }
    setDeletingAccount(account)
    setShowDeleteDialog(true)
  }

  const handleSubmit = (account: AccountRequest) => {
    if (account.status !== "DRAFT") {
      alert("Solo se pueden procesar solicitudes en estado DRAFT")
      return
    }
    setSubmittingAccount(account)
    setShowSubmitDialog(true)
  }

  const handleDeleted = () => {
    fetchAccounts()
  }

  const handleSubmitted = () => {
    fetchAccounts()
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Solicitudes de Creación de Cuentas</CardTitle>
            <CardDescription>Gestión completa de solicitudes Lemonway (CRUD)</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium block mb-2">Buscar</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre, email o referencia..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="min-w-[150px]">
                <label className="text-sm font-medium block mb-2">Estado</label>
                <Select
                  value={status}
                  onValueChange={(v) => {
                    setStatus(v)
                    setPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="DRAFT">Borrador</SelectItem>
                    <SelectItem value="SUBMITTED">Enviado</SelectItem>
                    <SelectItem value="KYC-1 Completo">KYC-1 Completo</SelectItem>
                    <SelectItem value="KYC-2 Completo">KYC-2 Completo</SelectItem>
                    <SelectItem value="INVALID">Inválido</SelectItem>
                    <SelectItem value="REJECTED">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tabla */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Validación</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Creada</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Cargando...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : accounts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No se encontraron solicitudes
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono text-sm font-semibold">{account.request_reference}</TableCell>
                        <TableCell>
                          {account.first_name} {account.last_name}
                        </TableCell>
                        <TableCell className="text-sm">{account.email}</TableCell>
                        <TableCell>{getStatusBadge(account.status)}</TableCell>
                        <TableCell>{getValidationBadge(account.validation_status)}</TableCell>
                        <TableCell className="text-sm">{account.profile_type}</TableCell>
                        <TableCell className="text-sm">{new Date(account.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Ver detalles"
                              onClick={() => handleViewDetails(account)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Editar"
                              onClick={() => handleEdit(account)}
                              disabled={account.status !== "DRAFT"}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Procesar"
                              onClick={() => handleSubmit(account)}
                              disabled={account.status !== "DRAFT"}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Eliminar"
                              onClick={() => handleDelete(account)}
                              disabled={account.status !== "DRAFT"}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación */}
            {pages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {pages} ({total} total)
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.min(pages, page + 1))}
                    disabled={page === pages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AccountDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        account={selectedAccount}
      />
      <AccountDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        account={deletingAccount}
        onDeleted={handleDeleted}
      />
      <AccountSubmitDialog
        isOpen={showSubmitDialog}
        onClose={() => setShowSubmitDialog(false)}
        account={submittingAccount}
        onSubmitted={handleSubmitted}
      />
    </>
  )
}

export default AccountsListTab
