"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, QrCode, Smartphone, Mail, MessageCircle, ShieldCheck, CheckCircle, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import QRCode from "qrcode"

interface SigningModalProps {
  document: {
    version_id: string
    display_name: string
    version_number: string
  }
  onClose: () => void
  onSuccess: () => void
}

type Step = "choose" | "qr" | "otp_method" | "otp_verify" | "success"

export function SigningModal({ document, onClose, onSuccess }: SigningModalProps) {
  const [step, setStep] = useState<Step>("choose")
  const [loading, setLoading] = useState(false)
  const [sessionData, setSessionData] = useState<any>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [otpMethod, setOtpMethod] = useState<string>("email")
  const [otpDestination, setOtpDestination] = useState<string>("")
  const [otpCode, setOtpCode] = useState<string>("")
  const [maskedDestination, setMaskedDestination] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null)
  const [signedDoc, setSignedDoc] = useState<any>(null)
  const { toast } = useToast()

  async function startSigning(channel: "desktop" | "mobile") {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/investors/documents/sign/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_version_id: document.version_id,
          channel,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Error al iniciar firma")
      }

      const data = await res.json()
      setSessionData(data.session)

      if (channel === "desktop" && data.qr) {
        // Generar QR code
        const qrUrl = await QRCode.toDataURL(data.qr.url, {
          width: 250,
          margin: 2,
        })
        setQrDataUrl(qrUrl)
        setStep("qr")
      } else {
        setStep("otp_method")
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function sendOTP() {
    if (!otpDestination) {
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
      setStep("otp_verify")
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

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/investors/documents/sign/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionData.id,
          code: otpCode,
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
      setStep("success")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  function handleSuccess() {
    toast({
      title: "Documento firmado",
      description: "El documento ha sido firmado correctamente",
    })
    onSuccess()
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Firmar {document.display_name}</DialogTitle>
          <DialogDescription>Versión {document.version_number}</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {step === "choose" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">¿Cómo quieres firmar el documento?</p>
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 justify-start bg-transparent"
                onClick={() => startSigning("desktop")}
              >
                <QrCode className="h-6 w-6 mr-3 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Escanear código QR</div>
                  <div className="text-xs text-gray-500">Completa la firma desde tu móvil</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 justify-start bg-transparent"
                onClick={() => startSigning("mobile")}
              >
                <Smartphone className="h-6 w-6 mr-3 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Firmar desde este dispositivo</div>
                  <div className="text-xs text-gray-500">Recibe un código de verificación</div>
                </div>
              </Button>
            </div>
          </div>
        )}

        {step === "qr" && (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-gray-600">Escanea este código QR con tu móvil para completar la firma</p>
            {qrDataUrl && (
              <img src={qrDataUrl || "/placeholder.svg"} alt="QR Code" className="mx-auto rounded-lg border" />
            )}
            <p className="text-xs text-gray-500">El código expira en 10 minutos</p>
            <Button variant="outline" onClick={() => setStep("otp_method")}>
              Prefiero firmar desde aquí
            </Button>
          </div>
        )}

        {step === "otp_method" && (
          <div className="space-y-4 py-4">
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

            <Button onClick={sendOTP} disabled={loading} className="w-full">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar código
            </Button>
          </div>
        )}

        {step === "otp_verify" && (
          <div className="space-y-4 py-4 text-center">
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
            <Button variant="link" onClick={() => setStep("otp_method")}>
              Reenviar código
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-green-700">Documento firmado correctamente</h3>
              <p className="text-sm text-gray-600 mt-1">
                CSV: <span className="font-mono">{signedDoc?.csv}</span>
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              {signedDoc?.pdf_url && (
                <Button variant="outline" asChild>
                  <a href={signedDoc.pdf_url} target="_blank" rel="noopener noreferrer">
                    Descargar PDF
                  </a>
                </Button>
              )}
              <Button onClick={handleSuccess}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
