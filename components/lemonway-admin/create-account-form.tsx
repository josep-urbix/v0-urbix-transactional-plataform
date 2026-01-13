"use client"

import type React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import type { Country, LemonwayAccountRequest } from "@/lib/types/lemonway-account-request"

const PROFILE_TYPES = ["PROJECT_HOLDER", "DONOR", "STUDENT", "JOB_SEEKER", "PAYER"]

export function CreateAccountForm() {
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(true)

  // Form data state
  const [formData, setFormData] = useState<Partial<LemonwayAccountRequest>>({
    first_name: "",
    last_name: "",
    birth_date: "",
    email: "",
    phone_number: "",
    birth_country_id: "",
    nationality_ids: [],
    profile_type: "PROJECT_HOLDER",
    street: "",
    city: "",
    postal_code: "",
    country_id: "",
    province: "",
  })

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [autoSaveMessage, setAutoSaveMessage] = useState("")
  const [requestId, setRequestId] = useState<string>("")
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const autoSaveCounterRef = useRef(0)

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await fetch("/api/investors/countries?is_active=true")
        const data = await res.json()
        if (data.success) {
          setCountries(data.data || [])
        }
      } catch (error) {
        console.error("[v0] Error loading countries:", error)
      } finally {
        setIsLoadingCountries(false)
      }
    }

    loadCountries()
  }, [])

  // Load existing draft on mount
  useEffect(() => {
    const recoverDraft = async () => {
      try {
        const res = await fetch("/api/admin/lemonway/accounts/request/recover")
        const data = await res.json()
        if (data.draft) {
          setFormData(data.draft)
          setRequestId(data.draft.requestId)
        }
      } catch (error) {
        console.error("[v0] Error recovering draft:", error)
      }
    }

    recoverDraft()
  }, [])

  // Auto-save handler with debouncing
  const handleAutoSave = useCallback(
    async (updatedData: Partial<LemonwayAccountRequest>) => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set saving status
      setAutoSaveStatus("saving")
      autoSaveCounterRef.current++

      // Debounce for 1.5 seconds
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/admin/lemonway/accounts/request/auto-save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId: requestId || undefined,
              ...updatedData,
            }),
          })

          const data = await res.json()

          if (res.ok) {
            if (!requestId) {
              setRequestId(data.requestId)
            }
            setAutoSaveStatus("saved")
            setAutoSaveMessage("Guardado")

            // Clear saved status after 2 seconds
            setTimeout(() => {
              setAutoSaveStatus("idle")
              setAutoSaveMessage("")
            }, 2000)
          } else {
            setAutoSaveStatus("error")
            setAutoSaveMessage(data.error || "Error al guardar")
          }
        } catch (error) {
          console.error("[v0] Auto-save error:", error)
          setAutoSaveStatus("error")
          setAutoSaveMessage("Error de conexión")
        }
      }, 1500)
    },
    [requestId],
  )

  // Handle input change with auto-save
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: string } },
  ) => {
    const { name, value } = e.target
    const updatedData = { ...formData, [name]: value }
    setFormData(updatedData)
    handleAutoSave(updatedData)
  }

  // Handle multi-select for nationalities
  const handleNationalityChange = (countryId: string) => {
    const nationalityIds = formData.nationality_ids || []
    const updated = nationalityIds.includes(countryId)
      ? nationalityIds.filter((id) => id !== countryId)
      : [...nationalityIds, countryId]

    const updatedData = { ...formData, nationality_ids: updated }
    setFormData(updatedData)
    handleAutoSave(updatedData)
  }

  // Auto-save status indicator
  const getAutoSaveIndicator = () => {
    switch (autoSaveStatus) {
      case "saving":
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Guardando...</span>
          </div>
        )
      case "saved":
        return (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>{autoSaveMessage}</span>
          </div>
        )
      case "error":
        return (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{autoSaveMessage}</span>
          </div>
        )
      default:
        return null
    }
  }

  const activeNationalities = countries.filter((c) => formData.nationality_ids?.includes(c.id))

  return (
    <div className="space-y-6">
      {requestId && (
        <Alert>
          <AlertDescription>
            Solicitud: <Badge variant="outline">{requestId}</Badge>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Crear Cuenta en Lemonway</CardTitle>
            <CardDescription>Fase 1: Información Básica</CardDescription>
          </div>
          <div>{getAutoSaveIndicator()}</div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Información Personal */}
          <div>
            <h3 className="font-semibold mb-4">Información Personal</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nombre *</label>
                  <Input
                    name="first_name"
                    value={formData.first_name || ""}
                    onChange={handleInputChange}
                    placeholder="Juan"
                    maxLength={35}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Máximo 35 caracteres</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Apellido *</label>
                  <Input
                    name="last_name"
                    value={formData.last_name || ""}
                    onChange={handleInputChange}
                    placeholder="García"
                    maxLength={35}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Máximo 35 caracteres</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Email *</label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email || ""}
                  onChange={handleInputChange}
                  placeholder="juan@example.com"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground mt-1">Máximo 60 caracteres</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Fecha de Nacimiento *</label>
                  <Input name="birth_date" type="date" value={formData.birth_date || ""} onChange={handleInputChange} />
                  <p className="text-xs text-muted-foreground mt-1">Debe ser mayor de 18 años</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input
                    name="phone_number"
                    value={formData.phone_number || ""}
                    onChange={handleInputChange}
                    placeholder="+34612345678"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Formato: +[country code]</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">País de Nacimiento *</label>
                {isLoadingCountries ? (
                  <div className="text-sm text-muted-foreground">Cargando países...</div>
                ) : (
                  <Select
                    value={formData.birth_country_id || ""}
                    onValueChange={(value) => handleInputChange({ target: { name: "birth_country_id", value } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona país..." />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.code_iso2} - {country.name_es}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">Nacionalidades * (múltiples)</label>
                <div className="border rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto">
                  {isLoadingCountries ? (
                    <div className="text-sm text-muted-foreground">Cargando...</div>
                  ) : (
                    countries.map((country) => (
                      <label key={country.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.nationality_ids?.includes(country.id) || false}
                          onChange={() => handleNationalityChange(country.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">
                          {country.code_iso2} - {country.name_es}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeNationalities.map((country) => (
                    <Badge key={country.id} variant="secondary">
                      {country.code_iso2}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <h3 className="font-semibold mb-4">Dirección</h3>
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium">Calle</label>
                <Input
                  name="street"
                  value={formData.street || ""}
                  onChange={handleInputChange}
                  placeholder="Calle 123"
                  maxLength={256}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Ciudad</label>
                  <Input
                    name="city"
                    value={formData.city || ""}
                    onChange={handleInputChange}
                    placeholder="Madrid"
                    maxLength={90}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Código Postal</label>
                  <Input
                    name="postal_code"
                    value={formData.postal_code || ""}
                    onChange={handleInputChange}
                    placeholder="28001"
                    maxLength={90}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">País *</label>
                  <Select
                    value={formData.country_id || ""}
                    onValueChange={(value) => handleInputChange({ target: { name: "country_id", value } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.id} value={country.id}>
                          {country.code_iso2} - {country.name_es}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Provincia/Estado</label>
                <Input
                  name="province"
                  value={formData.province || ""}
                  onChange={handleInputChange}
                  placeholder="Madrid"
                  maxLength={90}
                />
              </div>
            </div>
          </div>

          {/* Tipo de Perfil */}
          <div>
            <h3 className="font-semibold mb-4">Perfil de Inversor</h3>
            <div>
              <label className="text-sm font-medium">Tipo de Perfil *</label>
              <Select
                value={formData.profile_type || "PROJECT_HOLDER"}
                onValueChange={(value) => handleInputChange({ target: { name: "profile_type", value } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROFILE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-4 pt-4 border-t">
            <Button variant="outline" className="flex-1 bg-transparent">
              Cancelar
            </Button>
            <Button className="flex-1">Crear Cuenta</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CreateAccountForm
