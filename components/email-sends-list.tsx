"use client"

import type React from "react"

import { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  RefreshCw,
  Send,
  AlertCircle,
  MousePointerClick,
  MailOpen,
} from "lucide-react"
import type { EmailSend, EmailTemplate } from "@/lib/types/email"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface EmailSendsResponse {
  sends: EmailSend[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    total: string
    sent: string
    failed: string
    pending: string
  }
}

export function EmailSendsList() {
  const [filters, setFilters] = useState({
    status: "",
    templateSlug: "",
    search: "",
    fromDate: "",
    toDate: "",
  })
  const [page, setPage] = useState(1)
  const [selectedEmail, setSelectedEmail] = useState<EmailSend | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Build query string
  const queryParams = new URLSearchParams()
  queryParams.set("page", page.toString())
  queryParams.set("limit", "25")
  if (filters.status) queryParams.set("status", filters.status)
  if (filters.templateSlug) queryParams.set("templateSlug", filters.templateSlug)
  if (filters.search) queryParams.set("search", filters.search)
  if (filters.fromDate) queryParams.set("fromDate", filters.fromDate)
  if (filters.toDate) queryParams.set("toDate", filters.toDate)

  const { data, isLoading, mutate } = useSWR<EmailSendsResponse>(
    `/api/emails/sends?${queryParams.toString()}`,
    fetcher,
    { refreshInterval: 30000 },
  )

  const { data: templatesData } = useSWR<{ templates: EmailTemplate[] }>("/api/emails/templates", fetcher)

  const openDetail = (email: EmailSend) => {
    setSelectedEmail(email)
    setIsDetailOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }
    > = {
      pending: { variant: "outline", icon: <Clock className="h-3 w-3" />, label: "Pendiente" },
      sending: { variant: "outline", icon: <RefreshCw className="h-3 w-3 animate-spin" />, label: "Enviando" },
      sent: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" />, label: "Enviado" },
      failed: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: "Fallido" },
      bounced: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" />, label: "Rebotado" },
      opened: { variant: "default", icon: <Eye className="h-3 w-3" />, label: "Abierto" },
      clicked: { variant: "default", icon: <Send className="h-3 w-3" />, label: "Click" },
    }

    const config = statusConfig[status] || { variant: "secondary" as const, icon: null, label: status }

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const clearFilters = () => {
    setFilters({
      status: "",
      templateSlug: "",
      search: "",
      fromDate: "",
      toDate: "",
    })
    setPage(1)
  }

  const stats = data?.stats
  const sends = data?.sends || []
  const pagination = data?.pagination

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historial de Emails</h1>
          <p className="text-muted-foreground">Registro de todos los emails transaccionales enviados</p>
        </div>
        <Button variant="outline" onClick={() => mutate()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Enviados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Exitosos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.sent || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Fallidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Email o asunto..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                    setPage(1)
                  }}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, status: value }))
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                  <SelectItem value="failed">Fallidos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="sending">Enviando</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plantilla</Label>
              <Select
                value={filters.templateSlug}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, templateSlug: value }))
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {templatesData?.templates.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, fromDate: e.target.value }))
                  setPage(1)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, toDate: e.target.value }))
                  setPage(1)
                }}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emails Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Destinatario</TableHead>
                <TableHead>Asunto</TableHead>
                <TableHead>Plantilla</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MailOpen className="h-4 w-4" />
                    <span>Abierto</span>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MousePointerClick className="h-4 w-4" />
                    <span>Clics</span>
                  </div>
                </TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : sends.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No se encontraron emails
                  </TableCell>
                </TableRow>
              ) : (
                sends.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-mono text-sm">#{email.id}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{email.to_email}</div>
                        {email.to_name && <div className="text-sm text-muted-foreground">{email.to_name}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{email.subject}</TableCell>
                    <TableCell>
                      {email.template_name ? (
                        <Badge variant="outline">{email.template_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(email.status)}</TableCell>
                    <TableCell className="text-center">
                      {email.opened_at ? (
                        <div className="flex flex-col items-center">
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            {email.open_count || 1}x
                          </Badge>
                          <span className="text-xs text-muted-foreground mt-1">
                            {formatDate(email.opened_at).split(",")[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {email.clicked_at ? (
                        <div className="flex flex-col items-center">
                          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                            {email.click_count || 1}x
                          </Badge>
                          <span className="text-xs text-muted-foreground mt-1">
                            {formatDate(email.clicked_at).split(",")[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(email.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDetail(email)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Mostrando {(pagination.page - 1) * pagination.limit + 1} -{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page === pagination.totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Detalle del Email #{selectedEmail?.id}
            </DialogTitle>
            <DialogDescription>Información completa del email enviado</DialogDescription>
          </DialogHeader>

          {selectedEmail && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList>
                <TabsTrigger value="info">Información</TabsTrigger>
                <TabsTrigger value="content">Contenido</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="technical">Técnico</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <div className="mt-1">{getStatusBadge(selectedEmail.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Plantilla</Label>
                    <p className="mt-1">{selectedEmail.template_name || "Email directo"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Destinatario</Label>
                    <p className="mt-1">
                      {selectedEmail.to_name && `${selectedEmail.to_name} `}
                      &lt;{selectedEmail.to_email}&gt;
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Remitente</Label>
                    <p className="mt-1">
                      {selectedEmail.from_name && `${selectedEmail.from_name} `}
                      &lt;{selectedEmail.from_email}&gt;
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Creado</Label>
                    <p className="mt-1">{formatDate(selectedEmail.created_at)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Enviado</Label>
                    <p className="mt-1">{formatDate(selectedEmail.sent_at)}</p>
                  </div>
                </div>

                {selectedEmail.error_message && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <Label className="text-red-700">Error</Label>
                    <p className="mt-1 text-red-600">{selectedEmail.error_message}</p>
                  </div>
                )}

                {Object.keys(selectedEmail.variables_used || {}).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Variables utilizadas</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {Object.entries(selectedEmail.variables_used).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{`{{${key}}}`}</Badge>
                          <span className="text-muted-foreground">=</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="content" className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Asunto</Label>
                  <p className="mt-1 font-medium">{selectedEmail.subject}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Contenido HTML</Label>
                  <div
                    className="mt-2 border rounded-lg p-4 bg-white max-h-[400px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body_html || "" }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="tracking" className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Aperturas */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MailOpen className="h-5 w-5 text-green-600" />
                        Aperturas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEmail.opened_at ? (
                        <div className="space-y-2">
                          <div className="text-3xl font-bold text-green-600">{selectedEmail.open_count || 1}</div>
                          <div className="text-sm text-muted-foreground">
                            <div>Primera apertura: {formatDate(selectedEmail.opened_at)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">No se ha abierto todavía</div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Clics */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MousePointerClick className="h-5 w-5 text-blue-600" />
                        Clics en enlaces
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedEmail.clicked_at ? (
                        <div className="space-y-2">
                          <div className="text-3xl font-bold text-blue-600">{selectedEmail.click_count || 1}</div>
                          <div className="text-sm text-muted-foreground">
                            <div>Primer clic: {formatDate(selectedEmail.clicked_at)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">No se ha hecho clic en ningún enlace</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Detalles de tracking en metadata */}
                {selectedEmail.metadata && (
                  <>
                    {(selectedEmail.metadata as Record<string, unknown>).clicks && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Historial de clics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {(
                              (selectedEmail.metadata as Record<string, unknown>).clicks as Array<{
                                url: string
                                timestamp: string
                                userAgent?: string
                              }>
                            )?.map((click, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-muted rounded">
                                <MousePointerClick className="h-4 w-4 mt-0.5 text-blue-500" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-mono text-xs truncate">{click.url}</div>
                                  <div className="text-muted-foreground text-xs">
                                    {new Date(click.timestamp).toLocaleString("es-ES")}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="technical" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Gmail Message ID</Label>
                    <p className="mt-1 font-mono text-sm">{selectedEmail.gmail_message_id || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Gmail Thread ID</Label>
                    <p className="mt-1 font-mono text-sm">{selectedEmail.gmail_thread_id || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Template ID</Label>
                    <p className="mt-1 font-mono text-sm">{selectedEmail.template_id || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Template Slug</Label>
                    <p className="mt-1 font-mono text-sm">{selectedEmail.template_slug || "-"}</p>
                  </div>
                </div>

                {selectedEmail.metadata && Object.keys(selectedEmail.metadata).length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Metadata</Label>
                    <pre className="mt-2 p-4 bg-muted rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(selectedEmail.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
