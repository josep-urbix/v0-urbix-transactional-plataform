"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Loader2,
  Mail,
  MessageCircle,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileText,
  Eye,
  PenTool,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { SignatureCanvas } from "@/components/investor-portal/signature-canvas"

interface SigningPageProps {
  token: string
}

type PageState = "loading" | "expired" | "preview" | "signature" | "otp_method" | "otp_verify" | "success" | "error"

export function SigningPage({ token }: SigningPageProps) {
  const [state, setState] = useState<PageState>("loading")
  const [sessionData, setSessionData] = useState<any>(null)
  const [error, setError] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [otpMethod, setOtpMethod] = useState<string>("email")
  const [otpDestination, setOtpDestination] = useState<string>("")
  const [otpCode, setOtpCode] = useState<string>("")
  const [maskedDestination, setMaskedDestination] = useState<string>("")
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [signedDoc, setSignedDoc] = useState<any>(null)
  const [renderedContent, setRenderedContent] = useState<string>("")
  const [hasReadDocument, setHasReadDocument] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    validateToken()
  }, [token])

  async function validateToken() {
    try {
      const res = await fetch(`/api/investors/documents/sign/${token}`)
      const data = await res.json()

      if (!data.valid) {
        if (data.expired) {
          setSessionData(data.session)
          setState("expired")
        } else {
          setError(data.error || "Token no válido")
          setState("error")
        }
        return
      }

      setSessionData(data.session)

      if (data.session?.id) {
        try {
          const previewRes = await fetch(`/api/investors/documents/sign/${token}/preview`)
          if (previewRes.ok) {
            const previewData = await previewRes.json()
            setRenderedContent(previewData.content || "")
          }
        } catch (e) {
          console.error("Error loading document preview:", e)
        }
      }

      setState("preview")
    } catch (error) {
      setError("Error al validar el enlace")
      setState("error")
    }
  }

  useEffect(() => {
    if (sessionData) {
      if (otpMethod === "email" && sessionData.inversor_email) {
        setOtpDestination(sessionData.inversor_email)
      } else if (otpMethod === "sms" && sessionData.inversor_phone) {
        setOtpDestination(sessionData.inversor_phone)
      }
    }
  }, [otpMethod, sessionData])

  async function sendOTP() {
    if (!otpDestination && otpMethod !== "google_authenticator") {
      setError("Introduce el destino del código")
      return
    }

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/investors/documents/sign/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionData.id,
          method: otpMethod,
          destination: otpDestination,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al enviar código")
      }

      const data = await res.json()
      setMaskedDestination(data.maskedDestination)
      setState("otp_verify")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function verifyOTP() {
    if (!otpCode || otpCode.length !== 6) {
      setError("Introduce el código de 6 dígitos")
      return
    }

    if (!signatureDataUrl) {
      setError("Debes firmar el documento antes de continuar")
      return
    }

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/investors/documents/sign/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionData.id,
          code: otpCode,
          signature_data_url: signatureDataUrl,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts)
        }
        throw new Error(data.error || "Código incorrecto")
      }

      setSignedDoc(data.document)
      setState("success")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSignatureComplete(dataUrl: string) {
    setSignatureDataUrl(dataUrl)
    setState("otp_method")
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Validando enlace de firma...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Enlace no válido</h2>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <Button asChild>
              <Link href="/investor-portal/documents">Ir a Mis Documentos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Clock className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <CardTitle>El código QR ha caducado</CardTitle>
            <CardDescription>El enlace de firma ha expirado por seguridad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionData && (
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="text-gray-600">
                  <strong>Documento:</strong> {sessionData.document_type_name}
                </p>
                <p className="text-gray-600">
                  <strong>Email:</strong> {sessionData.inversor_email}
                </p>
              </div>
            )}
            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertTitle>¿Qué puedo hacer?</AlertTitle>
              <AlertDescription>
                Ve a tu área de documentos pendientes y genera un nuevo código QR para firmar el documento.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/investor-portal/documents">Ir a Mis Documentos</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/investor-portal">Volver al Portal</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-20 w-20 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Documento Firmado</h2>
            <p className="text-gray-600 text-center mb-2">El documento ha sido firmado correctamente</p>
            <p className="text-sm text-gray-500 font-mono mb-6">CSV: {signedDoc?.csv}</p>
            <div className="flex flex-col gap-2 w-full">
              {signedDoc?.pdf_url && (
                <Button variant="outline" asChild>
                  <a href={signedDoc.pdf_url} target="_blank" rel="noopener noreferrer">
                    Descargar PDF
                  </a>
                </Button>
              )}
              <Button asChild>
                <Link href="/investor-portal/documents">Ver Mis Documentos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state === "preview") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto pt-4">
          <Card>
            <CardHeader className="text-center border-b">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Eye className="h-6 w-6 text-blue-600" />
                <CardTitle>Revisar Documento</CardTitle>
              </div>
              <CardDescription>{sessionData?.document_type_name}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {error && (
                <Alert variant="destructive" className="m-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Document Preview */}
              <div className="bg-gray-100 p-4">
                <div className="bg-white rounded-lg shadow-sm border max-w-3xl mx-auto">
                  <div className="bg-gray-50 px-4 py-2 border-b text-sm text-gray-500 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Vista previa del documento
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div
                      className="p-6 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: renderedContent || "<p class='text-gray-400'>Cargando contenido...</p>",
                      }}
                    />
                  </ScrollArea>
                </div>
              </div>

              {/* Investor Info */}
              <div className="p-4 border-t bg-gray-50">
                <div className="max-w-3xl mx-auto">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Firmante:</span>
                      <p className="font-medium">{sessionData?.inversor_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <p className="font-medium">{sessionData?.inversor_email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accept and Continue */}
              <div className="p-4 border-t">
                <div className="max-w-3xl mx-auto space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="accept"
                      checked={hasReadDocument}
                      onCheckedChange={(checked) => setHasReadDocument(checked === true)}
                    />
                    <Label htmlFor="accept" className="text-sm leading-relaxed cursor-pointer">
                      He leído y entendido el contenido del documento. Acepto proceder con la firma electrónica.
                    </Label>
                  </div>
                  <Button onClick={() => setState("signature")} className="w-full" disabled={!hasReadDocument}>
                    Continuar con la firma
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (state === "signature") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="text-center mb-6">
            <PenTool className="h-12 w-12 text-blue-600 mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-gray-900">Firma el Documento</h1>
            <p className="text-gray-600">{sessionData?.document_type_name}</p>
          </div>
          <SignatureCanvas onSignatureComplete={handleSignatureComplete} onCancel={() => setState("preview")} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto pt-8">
        <Card>
          <CardHeader className="text-center">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-2" />
            <CardTitle>Firmar Documento</CardTitle>
            <CardDescription>{sessionData?.document_type_name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Signature Preview */}
            {signatureDataUrl && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Tu firma:</p>
                  <Button variant="ghost" size="sm" onClick={() => setState("signature")}>
                    Cambiar
                  </Button>
                </div>
                <div className="bg-white border rounded p-2">
                  <img src={signatureDataUrl || "/placeholder.svg"} alt="Firma" className="h-24 mx-auto" />
                </div>
              </div>
            )}

            {state === "otp_method" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Selecciona cómo quieres recibir el código de verificación</p>
                <RadioGroup value={otpMethod} onValueChange={setOtpMethod} className="grid gap-3">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="email" id="email" />
                    <Mail className="h-5 w-5 text-blue-600" />
                    <Label htmlFor="email" className="flex-1 cursor-pointer">
                      Correo electrónico
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="sms" id="sms" />
                    <MessageCircle className="h-5 w-5 text-green-600" />
                    <Label htmlFor="sms" className="flex-1 cursor-pointer">
                      SMS
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="google_authenticator" id="2fa" />
                    <ShieldCheck className="h-5 w-5 text-purple-600" />
                    <Label htmlFor="2fa" className="flex-1 cursor-pointer">
                      Google Authenticator
                    </Label>
                  </div>
                </RadioGroup>

                {otpMethod !== "google_authenticator" && (
                  <div className="space-y-2">
                    <Label>{otpMethod === "email" ? "Correo electrónico" : "Número de teléfono"}</Label>
                    <Input
                      type={otpMethod === "email" ? "email" : "tel"}
                      value={otpDestination}
                      onChange={(e) => setOtpDestination(e.target.value)}
                      placeholder={otpMethod === "email" ? "tu@email.com" : "+34 600 000 000"}
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setState("signature")} className="flex-1">
                    Volver
                  </Button>
                  <Button onClick={sendOTP} disabled={loading} className="flex-1">
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Enviar código
                  </Button>
                </div>
              </div>
            )}

            {state === "otp_verify" && (
              <div className="space-y-4 text-center">
                <ShieldCheck className="h-12 w-12 text-blue-600 mx-auto" />
                <p className="text-sm text-gray-600">
                  Hemos enviado un código de verificación a <strong>{maskedDestination}</strong>
                </p>
                <div className="space-y-2">
                  <Label>Código de verificación</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                {remainingAttempts !== null && remainingAttempts > 0 && (
                  <p className="text-sm text-orange-600">Te quedan {remainingAttempts} intentos</p>
                )}
                <Button onClick={verifyOTP} disabled={loading || otpCode.length !== 6} className="w-full">
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Verificar y firmar
                </Button>
                <Button variant="link" onClick={() => setState("otp_method")}>
                  Reenviar código
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
