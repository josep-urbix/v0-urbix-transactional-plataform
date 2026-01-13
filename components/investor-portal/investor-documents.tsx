"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FileText, Download, ExternalLink, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SigningModal } from "./signing-modal"

interface PendingDocument {
  type_id: string
  name: string
  display_name: string
  description: string
  dias_validez: number | null
  obligatorio_antes_de_invertir: boolean
  version_id: string
  version_number: string
}

interface SignedDocument {
  id: string
  csv: string
  status: "vigente" | "caducado" | "revocado" | "reemplazado"
  pdf_url: string
  firma_completed_at: string
  fecha_caducidad: string | null
  document_type_name: string
  version_number: string
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

export function InvestorDocuments() {
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([])
  const [signedDocs, setSignedDocs] = useState<SignedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [signingDoc, setSigningDoc] = useState<PendingDocument | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    try {
      const [pendingRes, signedRes] = await Promise.all([
        fetch("/api/investors/documents/pending"),
        fetch("/api/investors/documents/signed"),
      ])

      if (pendingRes.ok) {
        const data = await pendingRes.json()
        setPendingDocs(data.documents || [])
      }

      if (signedRes.ok) {
        const data = await signedRes.json()
        setSignedDocs(data.documents || [])
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los documentos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const obligatoryPending = pendingDocs.filter((d) => d.obligatorio_antes_de_invertir)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {obligatoryPending.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Documentos pendientes de firma</AlertTitle>
          <AlertDescription>
            Tienes {obligatoryPending.length} documento(s) obligatorio(s) pendiente(s) de firmar antes de poder realizar
            inversiones.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendientes ({pendingDocs.length})
          </TabsTrigger>
          <TabsTrigger value="signed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Firmados ({signedDocs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingDocs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                <p className="text-gray-600 font-medium">No tienes documentos pendientes de firma</p>
                <p className="text-gray-500 text-sm mt-1">Todos tus documentos están al día</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingDocs.map((doc) => (
                <Card key={doc.version_id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
                          {doc.display_name}
                          {doc.obligatorio_antes_de_invertir && <Badge variant="destructive">Obligatorio</Badge>}
                        </CardTitle>
                        <CardDescription>Versión {doc.version_number}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {doc.description && <p className="text-sm text-gray-600 mb-4">{doc.description}</p>}
                    <div className="flex items-center justify-between">
                      {doc.dias_validez && (
                        <span className="text-sm text-gray-500">Válido durante {doc.dias_validez} días</span>
                      )}
                      <Button onClick={() => setSigningDoc(doc)}>Firmar Documento</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="signed" className="mt-6">
          {signedDocs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500">Aún no has firmado ningún documento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {signedDocs.map((doc) => (
                <Card key={doc.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5 text-green-600" />
                          {doc.document_type_name}
                          <Badge className={statusColors[doc.status]}>{statusLabels[doc.status]}</Badge>
                        </CardTitle>
                        <CardDescription>
                          Versión {doc.version_number} - Firmado el{" "}
                          {new Date(doc.firma_completed_at).toLocaleDateString("es-ES")}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        <span className="font-mono">CSV: {doc.csv}</span>
                        {doc.fecha_caducidad && (
                          <span className="ml-4">
                            Caduca: {new Date(doc.fecha_caducidad).toLocaleDateString("es-ES")}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="h-4 w-4 mr-1" />
                            Descargar
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/verify/${doc.csv}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Verificar
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de firma */}
      {signingDoc && (
        <SigningModal
          document={signingDoc}
          onClose={() => setSigningDoc(null)}
          onSuccess={() => {
            setSigningDoc(null)
            fetchDocuments()
          }}
        />
      )}
    </div>
  )
}
