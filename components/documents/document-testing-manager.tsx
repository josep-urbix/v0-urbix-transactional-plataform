"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, ExternalLink, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DocumentType {
  id: string
  name: string
  display_name: string
  requiere_firma: boolean
}

interface DocumentVersion {
  id: string
  version_number: string
  status: string
}

interface SignatureSession {
  id: string
  inversor_email: string
  document_type: string
  version: string
  status: string
  token_firma: string
  expires_at: string
  created_at: string
}

export function DocumentTestingManager() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [sessions, setSessions] = useState<SignatureSession[]>([])

  const [selectedTypeId, setSelectedTypeId] = useState("")
  const [selectedVersionId, setSelectedVersionId] = useState("")
  const [investorEmail, setInvestorEmail] = useState("")
  const [createdSession, setCreatedSession] = useState<SignatureSession | null>(null)

  // Cargar tipos de documentos
  useEffect(() => {
    fetchDocumentTypes()
    fetchSessions()
  }, [])

  // Cargar versiones cuando se selecciona un tipo
  useEffect(() => {
    if (selectedTypeId) {
      fetchVersions(selectedTypeId)
    } else {
      setVersions([])
      setSelectedVersionId("")
    }
  }, [selectedTypeId])

  const fetchDocumentTypes = async () => {
    try {
      const res = await fetch("/api/admin/documents/types")
      if (!res.ok) throw new Error("Error al cargar tipos de documentos")
      const data = await res.json()
      const filteredTypes = (data.types || []).filter((t: DocumentType) => t.requiere_firma)
      setDocumentTypes(filteredTypes)
    } catch (error) {
      console.error("[Testing] Error loading document types:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los tipos de documentos",
        variant: "destructive",
      })
    }
  }

  const fetchVersions = async (typeId: string) => {
    try {
      const res = await fetch(`/api/admin/documents/versions?documentTypeId=${typeId}`)
      if (!res.ok) throw new Error("Error al cargar versiones")
      const data = await res.json()
      const publishedVersions = (data.versions || []).filter((v: DocumentVersion) => v.status === "publicado")
      setVersions(publishedVersions)
    } catch (error) {
      console.error("[Testing] Error loading versions:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las versiones",
        variant: "destructive",
      })
    }
  }

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/admin/documents/signatures?limit=10")
      if (!res.ok) throw new Error("Error al cargar sesiones")
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error("[Testing] Error loading sessions:", error)
    }
  }

  const createTestSession = async () => {
    if (!selectedTypeId || !selectedVersionId || !investorEmail) {
      toast({
        title: "Campos requeridos",
        description: "Debes seleccionar tipo, versión e ingresar email del inversor",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/documents/testing/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentVersionId: selectedVersionId,
          investorEmail,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Error al crear sesión")
      }

      const session = await res.json()
      setCreatedSession(session)
      fetchSessions()

      toast({
        title: "Sesión creada",
        description: "La sesión de firma se ha creado correctamente",
      })
    } catch (error: any) {
      console.error("[Testing] Error creating session:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copiado",
      description: "Enlace copiado al portapapeles",
    })
  }

  const getSigningUrl = (token: string) => {
    return `${window.location.origin}/investor-portal/sign/${token}`
  }

  const getQRCodeUrl = (token: string) => {
    const url = getSigningUrl(token)
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pendiente: "secondary",
      firmado: "default",
      expirado: "destructive",
      cancelado: "outline",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Testing de Firma de Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Crea sesiones de firma de prueba para validar el flujo completo de firma de documentos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Crear Sesión de Firma de Prueba</CardTitle>
          <CardDescription>
            Selecciona un tipo de documento, versión e inversor para crear una sesión de firma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo de Documento</Label>
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
                <SelectTrigger id="documentType">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.display_name} ({type.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Versión</Label>
              <Select value={selectedVersionId} onValueChange={setSelectedVersionId} disabled={!selectedTypeId}>
                <SelectTrigger id="version">
                  <SelectValue placeholder="Selecciona una versión" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version.id} value={version.id}>
                      v{version.version_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="investorEmail">Email del Inversor</Label>
            <Input
              id="investorEmail"
              type="email"
              placeholder="inversor@ejemplo.com"
              value={investorEmail}
              onChange={(e) => setInvestorEmail(e.target.value)}
            />
          </div>

          <Button onClick={createTestSession} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Sesión de Prueba
          </Button>
        </CardContent>
      </Card>

      {createdSession && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="space-y-4">
            <p className="font-semibold">Sesión creada exitosamente</p>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-shrink-0">
                <img
                  src={getQRCodeUrl(createdSession.token_firma) || "/placeholder.svg"}
                  alt="QR Code para firma"
                  className="w-48 h-48 border rounded-lg"
                />
                <p className="text-xs text-center text-muted-foreground mt-2">Escanea con tu móvil para firmar</p>
              </div>

              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Enlace de firma:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-sm break-all">
                    {getSigningUrl(createdSession.token_firma)}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(getSigningUrl(createdSession.token_firma))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(getSigningUrl(createdSession.token_firma), "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expira: {new Date(createdSession.expires_at).toLocaleString()}
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sesiones Recientes</CardTitle>
          <CardDescription>Últimas 10 sesiones de firma creadas</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay sesiones de firma aún</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{session.document_type}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.inversor_email} - v{session.version}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Creada: {new Date(session.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(session.status)}
                    {session.status === "pendiente" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(getSigningUrl(session.token_firma), "_blank")}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
