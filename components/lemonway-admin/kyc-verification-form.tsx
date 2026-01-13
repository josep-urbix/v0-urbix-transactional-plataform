"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, CheckCircle2, Loader2, AlertTriangle } from "lucide-react"
import type { Country, LemonwayAccountRequest } from "@/lib/types/lemonway-account-request"

const OCCUPATIONS = ["EMPLOYEE", "FREELANCER", "BUSINESS_OWNER", "RETIRED", "STUDENT", "UNEMPLOYED", "OTHER"]

const INCOME_RANGES = [
  { value: "0-10K", label: "0 - 10K €" },
  { value: "10K-25K", label: "10K - 25K €" },
  { value: "25K-50K", label: "25K - 50K €" },
  { value: "50K-100K", label: "50K - 100K €" },
  { value: "100K+", label: ">100K €" },
]

const WEALTH_RANGES = [
  { value: "0-50K", label: "0 - 50K €" },
  { value: "50K-100K", label: "50K - 100K €" },
  { value: "100K-500K", label: "100K - 500K €" },
  { value: "500K+", label: ">500K €" },
]

const PEP_POSITIONS = ["POLITICAL_LEADER", "POLITICIAN_RELATIVE", "PUBLIC_OFFICIAL", "INTERNATIONAL_OFFICIAL"]

const FUND_SOURCES = ["INCOME", "INVESTMENTS", "INHERITANCE", "OWN_BUSINESS", "OTHER"]

interface KYCFormProps {
  requestId: string
  request?: Partial<LemonwayAccountRequest>
}

function KYCVerificationForm({ requestId, request }: KYCFormProps) {
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(true)

  const [formData, setFormData] = useState<Partial<LemonwayAccountRequest>>({
    street: request?.street || "",
    city: request?.city || "",
    postal_code: request?.postal_code || "",
    country_id: request?.country_id || "",
    province: request?.province || "",
    occupation: request?.occupation || "",
    annual_income: request?.annual_income || "",
    estimated_wealth: request?.estimated_wealth || "",
    pep_status: request?.pep_status || "no",
    pep_position: request?.pep_position || "",
    pep_start_date: request?.pep_start_date || "",
    pep_end_date: request?.pep_end_date || "",
    origin_of_funds: request?.origin_of_funds || [],
    has_ifi_tax: request?.has_ifi_tax || false,
  })

  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [autoSaveMessage, setAutoSaveMessage] = useState("")
  const debounceTimerRef = useRef<NodeJS.Timeout>()

  // Cargar países
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await fetch("/api/investors/countries?is_active=true")
        const data = await res.json()
        setCountries(data)
      } catch (error) {
        console.error("[v0] Error cargando países:", error)
      } finally {
        setIsLoadingCountries(false)
      }
    }
    loadCountries()
  }, [])

  // Auto-guardado con debounce (1.5 segundos)
  const handleFieldChange = useCallback(
    (field: string, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }))

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      setAutoSaveStatus("saving")
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const response = await fetch("/api/admin/lemonway/accounts/request/auto-save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId,
              ...formData,
              [field]: value,
            }),
          })

          if (response.ok) {
            setAutoSaveStatus("saved")
            setAutoSaveMessage("✓ Guardado")
            setTimeout(() => setAutoSaveStatus("idle"), 2000)
          } else {
            setAutoSaveStatus("error")
            setAutoSaveMessage("Error al guardar")
          }
        } catch (error) {
          console.error("[v0] Error guardando:", error)
          setAutoSaveStatus("error")
          setAutoSaveMessage("Error de conexión")
        }
      }, 1500)
    },
    [requestId, formData],
  )

  // Manejar envío de KYC
  const handleSubmitKYC = async () => {
    try {
      setAutoSaveStatus("saving")

      const response = await fetch(`/api/admin/lemonway/accounts/${requestId}/initiate-kyc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setAutoSaveStatus("saved")
        setAutoSaveMessage("✓ KYC enviado exitosamente")
      } else {
        setAutoSaveStatus("error")
        setAutoSaveMessage(data.error || "Error al enviar KYC")
      }
    } catch (error) {
      console.error("[v0] Error enviando KYC:", error)
      setAutoSaveStatus("error")
      setAutoSaveMessage("Error de conexión")
    }
  }

  const handleOriginOfFundsChange = (source: string) => {
    setFormData((prev) => {
      const updated = prev.origin_of_funds || []
      if (updated.includes(source)) {
        return { ...prev, origin_of_funds: updated.filter((s) => s !== source) }
      } else {
        return { ...prev, origin_of_funds: [...updated, source] }
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>FASE 2: Verificación KYC/AML</CardTitle>
          <CardDescription>Solicitud {requestId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estado de auto-guardado */}
          {autoSaveStatus !== "idle" && (
            <Alert variant={autoSaveStatus === "error" ? "destructive" : "default"}>
              <div className="flex items-center gap-2">
                {autoSaveStatus === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
                {autoSaveStatus === "saved" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {autoSaveStatus === "error" && <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{autoSaveMessage}</AlertDescription>
              </div>
            </Alert>
          )}

          {/* SECCIÓN 2A: Información de Dirección */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-semibold">Información de Dirección</h3>

            <div>
              <label className="text-sm font-medium">Calle *</label>
              <Input
                placeholder="Rue de la Paix 123"
                value={formData.street || ""}
                onChange={(e) => handleFieldChange("street", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Ciudad *</label>
              <Input
                placeholder="París"
                value={formData.city || ""}
                onChange={(e) => handleFieldChange("city", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Código Postal *</label>
              <Input
                placeholder="75000"
                value={formData.postal_code || ""}
                onChange={(e) => handleFieldChange("postal_code", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">País de Residencia *</label>
              <Select value={formData.country_id || ""} onValueChange={(val) => handleFieldChange("country_id", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar país..." />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.iso_alpha_2} value={c.iso_alpha_2}>
                      {c.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Provincia/Estado (si aplica)</label>
              <Input
                placeholder="Île-de-France"
                value={formData.province || ""}
                onChange={(e) => handleFieldChange("province", e.target.value)}
              />
            </div>
          </div>

          {/* SECCIÓN 2B: Perfil Financiero */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-semibold">Información Financiera</h3>

            <div>
              <label className="text-sm font-medium">Profesión *</label>
              <Select value={formData.occupation || ""} onValueChange={(val) => handleFieldChange("occupation", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar profesión..." />
                </SelectTrigger>
                <SelectContent>
                  {OCCUPATIONS.map((occ) => (
                    <SelectItem key={occ} value={occ}>
                      {occ.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Ingresos Anuales *</label>
              <Select
                value={formData.annual_income || ""}
                onValueChange={(val) => handleFieldChange("annual_income", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rango..." />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_RANGES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Patrimonio Estimado *</label>
              <Select
                value={formData.estimated_wealth || ""}
                onValueChange={(val) => handleFieldChange("estimated_wealth", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rango..." />
                </SelectTrigger>
                <SelectContent>
                  {WEALTH_RANGES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SECCIÓN 2C: Información Complementaria */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-semibold">Información Complementaria</h3>

            <div>
              <label className="text-sm font-medium">¿Eres Persona Políticamente Expuesta (PEP)? *</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pep_status"
                    value="no"
                    checked={formData.pep_status === "no"}
                    onChange={(e) => handleFieldChange("pep_status", e.target.value)}
                  />
                  No
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pep_status"
                    value="yes"
                    checked={formData.pep_status === "yes"}
                    onChange={(e) => handleFieldChange("pep_status", e.target.value)}
                  />
                  Sí
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pep_status"
                    value="close_to_pep"
                    checked={formData.pep_status === "close_to_pep"}
                    onChange={(e) => handleFieldChange("pep_status", e.target.value)}
                  />
                  Cercano a PEP
                </label>
              </div>
            </div>

            {formData.pep_status !== "no" && (
              <>
                <div>
                  <label className="text-sm font-medium">Posición PEP</label>
                  <Select
                    value={formData.pep_position || ""}
                    onValueChange={(val) => handleFieldChange("pep_position", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar posición..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PEP_POSITIONS.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Fecha Inicio</label>
                    <Input
                      type="date"
                      value={formData.pep_start_date || ""}
                      onChange={(e) => handleFieldChange("pep_start_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fecha Fin (opcional)</label>
                    <Input
                      type="date"
                      value={formData.pep_end_date || ""}
                      onChange={(e) => handleFieldChange("pep_end_date", e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Origen de Fondos *</label>
              <div className="space-y-2">
                {FUND_SOURCES.map((source) => (
                  <label key={source} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={(formData.origin_of_funds || []).includes(source)}
                      onCheckedChange={() => handleOriginOfFundsChange(source)}
                    />
                    {source.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.has_ifi_tax || false}
                onCheckedChange={(checked) => handleFieldChange("has_ifi_tax", checked)}
              />
              <span className="text-sm">Sujeto a Impuesto sobre la Riqueza (IFI)</span>
            </label>
          </div>

          {/* Información adicional */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Los documentos serán solicitados por Lemonway en su plataforma de onboarding después de enviar este
              formulario.
            </AlertDescription>
          </Alert>

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline">Cancelar</Button>
            <Button onClick={handleSubmitKYC} disabled={autoSaveStatus === "saving"}>
              {autoSaveStatus === "saving" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar y Enviar KYC
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default KYCVerificationForm
