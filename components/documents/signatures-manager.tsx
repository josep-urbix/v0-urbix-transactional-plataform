"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Download, Search, FileCheck, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SignedDocument {
  id: string
  csv: string
  status: "vigente" | "caducado" | "revocado" | "reemplazado"
  pdf_url: string
  firma_completed_at: string
  fecha_caducidad: string | null
  inversor_email: string
  inversor_name: string
  version_number: string
  document_type_name: string
  document_type_code: string
  metodo_otp_usado: string
}

const statusColors = {
  vigente: "bg-green-100 text-green-800",
  caducado: "bg-yellow-100 text-yellow-800",
  revocado: "bg-red-100 text-red-800",
  reemplazado: "bg-gray-100 text-gray-800",
}

const statusLabels = {
  vigente: "Vigente",
  caducado: "Caducado",
  revocado: "Revocado",
  reemplazado: "Reemplazado",
}

export function SignaturesManager() {
  const [documents, setDocuments] = useState<SignedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const limit = 20

  useEffect(() => {
    fetchDocuments()
  }, [page, statusFilter])

  async function fetchDocuments() {
    setLoading(true)
    try {
      let url = `/api/admin/documents/signed?limit=${limit}&offset=${page * limit}`
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`
      }

      const res = await fetch(url)
      if (!res.ok) throw new Error("Error al cargar")
      const data = await res.json()
      setDocuments(data.documents || [])
      setTotal(data.total || 0)
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los documentos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter((doc) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      doc.inversor_email?.toLowerCase().includes(search) ||
      doc.inversor_name?.toLowerCase().includes(search) ||
      doc.csv?.toLowerCase().includes(search) ||
      doc.document_type_name?.toLowerCase().includes(search)
    )
  })

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por email, nombre o CSV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="vigente">Vigente</SelectItem>
            <SelectItem value="caducado">Caducado</SelectItem>
            <SelectItem value="revocado">Revocado</SelectItem>
            <SelectItem value="reemplazado">Reemplazado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileCheck className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No hay documentos firmados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Inversor</TableHead>
                  <TableHead>Fecha Firma</TableHead>
                  <TableHead>Caducidad</TableHead>
                  <TableHead>OTP</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-xs">{doc.csv}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{doc.document_type_name}</div>
                        <div className="text-xs text-gray-500">v{doc.version_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{doc.inversor_name}</div>
                        <div className="text-xs text-gray-500">{doc.inversor_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(doc.firma_completed_at).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      {doc.fecha_caducidad ? new Date(doc.fecha_caducidad).toLocaleDateString("es-ES") : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {doc.metodo_otp_usado?.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[doc.status]}>{statusLabels[doc.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/verify/${doc.csv}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, total)} de {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 0}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
