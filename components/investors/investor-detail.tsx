"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  User,
  Shield,
  Wallet,
  Activity,
  Monitor,
  LogOut,
  Save,
  Trash2,
  LinkIcon,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface InvestorDetailProps {
  investorId: string
}

export function InvestorDetail({ investorId }: InvestorDetailProps) {
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showLinkWalletDialog, setShowLinkWalletDialog] = useState(false)
  const [walletId, setWalletId] = useState("")

  useEffect(() => {
    fetchInvestor()
  }, [investorId])

  async function fetchInvestor() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/investors/${investorId}`)
      const result = await res.json()
      setData(result)
      setFormData({
        first_name: result.investor?.first_name || "",
        last_name: result.investor?.last_name || "",
        phone: result.investor?.phone || "",
        status: result.investor?.status || "",
        status_reason: result.investor?.status_reason || "",
        kyc_status: result.investor?.kyc_status || "",
        kyc_level: result.investor?.kyc_level || 0,
      })
    } catch (error) {
      console.error("Error fetching investor:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`/api/admin/investors/${investorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      await fetchInvestor()
      setEditMode(false)
    } catch (error) {
      console.error("Error saving investor:", error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      await fetch(`/api/admin/investors/${investorId}`, { method: "DELETE" })
      router.push("/dashboard/investors")
    } catch (error) {
      console.error("Error deleting investor:", error)
    }
  }

  async function handleRevokeAllSessions() {
    try {
      await fetch(`/api/admin/investors/${investorId}/sessions`, { method: "DELETE" })
      await fetchInvestor()
    } catch (error) {
      console.error("Error revoking sessions:", error)
    }
  }

  async function handleLinkWallet() {
    if (!walletId) return
    try {
      await fetch(`/api/admin/investors/${investorId}/wallets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet_id: walletId }),
      })
      await fetchInvestor()
      setShowLinkWalletDialog(false)
      setWalletId("")
    } catch (error) {
      console.error("Error linking wallet:", error)
    }
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

  if (loading) {
    return <div className="p-8 text-center">Cargando...</div>
  }

  if (!data?.investor) {
    return <div className="p-8 text-center">Inversor no encontrado</div>
  }

  const { investor, sessions, devices, wallets, activity, loginAttempts } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/investors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {investor.display_name ||
                `${investor.first_name || ""} ${investor.last_name || ""}`.trim() ||
                investor.email}
            </h1>
            <p className="text-muted-foreground">{investor.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditMode(true)}>
                Editar
              </Button>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Seguridad
          </TabsTrigger>
          <TabsTrigger value="wallets">
            <Wallet className="h-4 w-4 mr-2" />
            Wallets
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Actividad
          </TabsTrigger>
          <TabsTrigger value="devices">
            <Monitor className="h-4 w-4 mr-2" />
            Dispositivos
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  {editMode ? (
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1">{investor.first_name || "-"}</p>
                  )}
                </div>
                <div>
                  <Label>Apellidos</Label>
                  {editMode ? (
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1">{investor.last_name || "-"}</p>
                  )}
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="mt-1">{investor.email}</p>
                </div>
                <div>
                  <Label>Teléfono</Label>
                  {editMode ? (
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  ) : (
                    <p className="mt-1">{investor.phone || "-"}</p>
                  )}
                </div>
                <div>
                  <Label>Estado</Label>
                  {editMode ? (
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="pending_verification">Pendiente</SelectItem>
                        <SelectItem value="suspended">Suspendido</SelectItem>
                        <SelectItem value="blocked">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">
                      <Badge>{investor.status}</Badge>
                    </div>
                  )}
                </div>
                <div>
                  <Label>KYC</Label>
                  {editMode ? (
                    <Select
                      value={formData.kyc_status}
                      onValueChange={(v) => setFormData({ ...formData, kyc_status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin KYC</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="approved">Aprobado</SelectItem>
                        <SelectItem value="rejected">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">
                      <Badge>{investor.kyc_status}</Badge>
                    </div>
                  )}
                </div>
              </div>
              {editMode && (
                <div>
                  <Label>Razón del estado</Label>
                  <Input
                    value={formData.status_reason}
                    onChange={(e) => setFormData({ ...formData, status_reason: e.target.value })}
                    placeholder="Razón del cambio de estado..."
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fechas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Registro</Label>
                  <p className="mt-1">{formatDate(investor.created_at)}</p>
                </div>
                <div>
                  <Label>Último login</Label>
                  <p className="mt-1">{formatDate(investor.last_login_at)}</p>
                </div>
                <div>
                  <Label>KYC verificado</Label>
                  <p className="mt-1">{formatDate(investor.kyc_verified_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Autenticación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Email verificado</span>
                  <Badge variant={investor.email_verified ? "default" : "secondary"}>
                    {investor.email_verified ? "Sí" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>2FA activo</span>
                  <Badge variant={investor.two_factor_enabled ? "default" : "secondary"}>
                    {investor.two_factor_enabled ? "Sí" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Google vinculado</span>
                  <Badge variant={investor.google_id ? "default" : "secondary"}>
                    {investor.google_id ? "Sí" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Apple vinculado</span>
                  <Badge variant={investor.apple_id ? "default" : "secondary"}>{investor.apple_id ? "Sí" : "No"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sesiones Activas ({sessions?.length || 0})</CardTitle>
                <CardDescription>Sesiones actualmente activas del usuario</CardDescription>
              </div>
              {sessions?.length > 0 && (
                <Button variant="destructive" size="sm" onClick={handleRevokeAllSessions}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar todas
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {sessions?.length === 0 ? (
                <p className="text-muted-foreground">No hay sesiones activas</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead>Última actividad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions?.map((session: any) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <p>{session.device_name || "Desconocido"}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.browser} / {session.os}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{session.ip_address || "-"}</TableCell>
                        <TableCell>{formatDate(session.created_at)}</TableCell>
                        <TableCell>{formatDate(session.last_activity_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Intentos de Login Recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {loginAttempts?.length === 0 ? (
                <p className="text-muted-foreground">No hay intentos de login registrados</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Método</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loginAttempts?.slice(0, 10).map((attempt: any) => (
                      <TableRow key={attempt.id}>
                        <TableCell>{attempt.auth_method}</TableCell>
                        <TableCell>
                          <Badge variant={attempt.success ? "default" : "destructive"}>
                            {attempt.success ? "Éxito" : attempt.failure_reason || "Fallido"}
                          </Badge>
                        </TableCell>
                        <TableCell>{attempt.ip_address || "-"}</TableCell>
                        <TableCell>{formatDate(attempt.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Wallets Vinculados</CardTitle>
                <CardDescription>Wallets de Lemonway vinculados a este usuario</CardDescription>
              </div>
              <Button onClick={() => setShowLinkWalletDialog(true)}>
                <LinkIcon className="h-4 w-4 mr-2" />
                Vincular Wallet
              </Button>
            </CardHeader>
            <CardContent>
              {wallets?.length === 0 ? (
                <p className="text-muted-foreground">No hay wallets vinculados</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Wallet ID</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Verificado</TableHead>
                      <TableHead>Última sincronización</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wallets?.map((wallet: any) => (
                      <TableRow key={wallet.id}>
                        <TableCell className="font-mono">{wallet.wallet_id}</TableCell>
                        <TableCell>
                          <Badge>{wallet.status}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(wallet.verified_at)}</TableCell>
                        <TableCell>{formatDate(wallet.last_sync_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Log de Actividad</CardTitle>
              <CardDescription>Últimas 50 actividades del usuario</CardDescription>
            </CardHeader>
            <CardContent>
              {activity?.length === 0 ? (
                <p className="text-muted-foreground">No hay actividad registrada</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Acción</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activity?.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.category}</Badge>
                        </TableCell>
                        <TableCell>{log.description || "-"}</TableCell>
                        <TableCell>{log.ip_address || "-"}</TableCell>
                        <TableCell>{formatDate(log.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Dispositivos Conocidos</CardTitle>
              <CardDescription>Dispositivos desde los que se ha conectado el usuario</CardDescription>
            </CardHeader>
            <CardContent>
              {devices?.length === 0 ? (
                <p className="text-muted-foreground">No hay dispositivos registrados</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispositivo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Confianza</TableHead>
                      <TableHead>Primera vez</TableHead>
                      <TableHead>Última vez</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices?.map((device: any) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div>
                            <p>{device.name || "Desconocido"}</p>
                            <p className="text-xs text-muted-foreground">
                              {device.browser} / {device.os}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{device.device_type}</TableCell>
                        <TableCell>
                          <Badge variant={device.is_trusted ? "default" : "secondary"}>
                            {device.is_trusted ? "Confiable" : "No confiable"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(device.first_seen_at)}</TableCell>
                        <TableCell>{formatDate(device.last_seen_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar Inversor
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres eliminar este inversor? Esta acción no se puede deshacer. Todas sus sesiones
              serán revocadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Wallet Dialog */}
      <Dialog open={showLinkWalletDialog} onOpenChange={setShowLinkWalletDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Wallet</DialogTitle>
            <DialogDescription>
              Introduce el ID del wallet de Lemonway para vincularlo a este usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Wallet ID</Label>
            <Input value={walletId} onChange={(e) => setWalletId(e.target.value)} placeholder="Ej: 12345678" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkWalletDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleLinkWallet} disabled={!walletId}>
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
