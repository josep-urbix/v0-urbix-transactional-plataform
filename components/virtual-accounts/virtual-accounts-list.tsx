"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, ExternalLink } from "lucide-react"
import Link from "next/link"

interface VirtualAccount {
  id: string
  account_number: string
  owner_id: string
  balance: string
  status: string
  created_at: string
  transaction_count: number
  owner_data?: {
    email: string
    name?: string
  }
}

export function VirtualAccountsList() {
  const [accounts, setAccounts] = useState<VirtualAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchAccounts()
  }, [statusFilter, search])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (search) params.append("search", search)

      const response = await fetch(`/api/admin/virtual-accounts/accounts?${params}`)
      if (!response.ok) throw new Error("Error al cargar cuentas")

      const data = await response.json()
      setAccounts(data.accounts || [])
    } catch (error) {
      console.error("Error fetching accounts:", error)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredAccounts = accounts.filter(
    (account) =>
      account.account_number.toLowerCase().includes(search.toLowerCase()) ||
      account.owner_data?.email.toLowerCase().includes(search.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "frozen":
        return "bg-blue-100 text-blue-800"
      case "closed":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-[#E6E6E6]">
        <div className="flex justify-between items-center">
          <CardTitle className="text-[#164AA6]">Lista de Cuentas Virtuales</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#777777]" />
            <Input
              placeholder="Buscar por número de cuenta o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-[#E6E6E6] rounded-md px-4 py-2 text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activas</option>
            <option value="frozen">Congeladas</option>
            <option value="closed">Cerradas</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[#777777]">Cargando cuentas...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número de Cuenta</TableHead>
                <TableHead>Propietario</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Transacciones</TableHead>
                <TableHead>Fecha Creación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-[#777777] py-8">
                    No se encontraron cuentas
                  </TableCell>
                </TableRow>
              ) : (
                filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.account_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{account.owner_data?.name || "Sin nombre"}</div>
                        <div className="text-sm text-[#777777]">{account.owner_data?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{Number.parseFloat(account.balance).toFixed(2)} EUR</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(account.status)}>{account.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{account.transaction_count}</TableCell>
                    <TableCell>{new Date(account.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/virtual-accounts/${account.id}`}>
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
        )}
      </CardContent>
    </Card>
  )
}
