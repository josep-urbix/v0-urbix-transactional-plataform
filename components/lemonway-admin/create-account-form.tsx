"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertCircle } from "lucide-react"
import { ChevronDown } from "lucide-react"

const PROFILE_TYPES = [
  { value: "PROJECT_HOLDER", label: "Titular de Proyecto" },
  { value: "DONOR", label: "Donante" },
  { value: "STUDENT", label: "Estudiante" },
  { value: "JOB_SEEKER", label: "Solicitante de Empleo" },
  { value: "PAYER", label: "Pagador" },
]

export default function CreateAccountForm() {
  const [isLoadingCountries, setIsLoadingCountries] = useState(false)
  const [countries, setCountries] = useState([])
  const [editingRequestId, setEditingRequestId] = useState(null)
  const [isLoadingEditData, setIsLoadingEditData] = useState(false)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    birth_date: "",
    email: "",
    phone_number: "",
    birth_country_id: "",
    nationality_ids: [],
    profile_type: "",
    street: "",
    city: "",
    postal_code: "",
    country_id: "",
    province: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [duplicateError, setDuplicateError] = useState(null)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false)

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoadingCountries(true)
      try {
        const response = await fetch("/api/investors/countries")
        const result = await response.json()
        if (result.success && result.data) {
          setCountries(result.data)
        }
      } catch (error) {
        console.error("[v0] Error fetching countries:", error)
      } finally {
        setIsLoadingCountries(false)
      }
    }
    fetchCountries()
  }, [])

  useEffect(() => {
    const handleEditEvent = async (event) => {
      const requestId = event.detail
      setEditingRequestId(requestId)
      setIsLoadingEditData(true)

      try {
        const response = await fetch(`/api/admin/lemonway/accounts/${requestId}`)
        const result = await response.json()

        if (result.success && result.data) {
          const account = result.data
          setFormData({
            first_name: account.first_name || "",
            last_name: account.last_name || "",
            birth_date: account.birth_date || "",
            email: account.email || "",
            phone_number: account.phone_number || "",
            birth_country_id: account.birth_country_id || "",
            nationality_ids: account.nationality_ids || [],
            profile_type: account.profile_type || "",
            street: account.street || "",
            city: account.city || "",
            postal_code: account.postal_code || "",
            country_id: account.country_id || "",
            province: account.province || "",
          })
          // Scroll to form
          window.scrollTo({ top: 0, behavior: "smooth" })
        }
      } catch (error) {
        console.error("[v0] Error loading request data:", error)
      } finally {
        setIsLoadingEditData(false)
      }
    }

    window.addEventListener("editAccount", handleEditEvent)
    return () => window.removeEventListener("editAccount", handleEditEvent)
  }, [])

  // Auto-save DRAFT
  useEffect(() => {
    const autoSaveTimer = setTimeout(async () => {
      if (formData.first_name || formData.email || formData.birth_date || formData.last_name) {
        try {
          await fetch("/api/admin/lemonway/accounts/request/auto-save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          })
        } catch (error) {
          console.error("[v0] Auto-save error:", error)
        }
      }
    }, 3000)

    return () => clearTimeout(autoSaveTimer)
  }, [formData])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleNationalityChange = (countryId) => {
    setFormData((prev) => ({
      ...prev,
      nationality_ids: prev.nationality_ids.includes(countryId)
        ? prev.nationality_ids.filter((id) => id !== countryId)
        : [...prev.nationality_ids, countryId],
    }))
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.first_name.trim()) newErrors.first_name = "Requerido"
    if (!formData.last_name.trim()) newErrors.last_name = "Requerido"
    if (!formData.birth_date) newErrors.birth_date = "Requerido"
    if (!formData.email.trim()) newErrors.email = "Requerido"
    if (!formData.birth_country_id) newErrors.birth_country_id = "Requerido"
    if (!formData.profile_type) newErrors.profile_type = "Requerido"
    if (formData.nationality_ids.length === 0) newErrors.nationality_ids = "Requerido"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/admin/lemonway/accounts/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.status === 409 && result.status === "DUPLICATE_FOUND") {
        setDuplicateError(result)
        setShowDuplicateModal(true)
        return
      }

      if (!response.ok) {
        throw new Error(result.error || "Error creating account")
      }

      // Success - reset form
      setFormData({
        first_name: "",
        last_name: "",
        birth_date: "",
        email: "",
        phone_number: "",
        birth_country_id: "",
        nationality_ids: [],
        profile_type: "",
        street: "",
        city: "",
        postal_code: "",
        country_id: "",
        province: "",
      })
      setErrors({})
      alert("Cuenta creada exitosamente")
    } catch (error) {
      console.error("[v0] Account creation error:", error)
      setErrors({ submit: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Personal */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Información Personal</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                name="first_name"
                placeholder="Juan"
                value={formData.first_name}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              {errors.first_name && <span className="text-xs text-red-500">{errors.first_name}</span>}
            </div>

            <div>
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                name="last_name"
                placeholder="García"
                value={formData.last_name}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              {errors.last_name && <span className="text-xs text-red-500">{errors.last_name}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birth_date">Fecha de Nacimiento *</Label>
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              {errors.birth_date && <span className="text-xs text-red-500">{errors.birth_date}</span>}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="juan@example.com"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
              {errors.email && <span className="text-xs text-red-500">{errors.email}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone_number">Teléfono</Label>
              <Input
                id="phone_number"
                name="phone_number"
                placeholder="+34 612 345 678"
                value={formData.phone_number}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="birth_country_id">País de Nacimiento *</Label>
              <Select
                value={formData.birth_country_id}
                onValueChange={(value) => handleSelectChange("birth_country_id", value)}
                disabled={isLoadingCountries || isSubmitting}
              >
                <SelectTrigger id="birth_country_id">
                  <SelectValue placeholder="Selecciona un país" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      {country.name_en || country.name_es || "País desconocido"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.birth_country_id && <span className="text-xs text-red-500">{errors.birth_country_id}</span>}
            </div>
          </div>
        </div>

        {/* Información de Dirección */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Información de Dirección</h3>

          <div>
            <Label htmlFor="street">Calle</Label>
            <Input
              id="street"
              name="street"
              placeholder="Calle Principal, 123"
              value={formData.street}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                name="city"
                placeholder="Madrid"
                value={formData.city}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input
                id="postal_code"
                name="postal_code"
                placeholder="28001"
                value={formData.postal_code}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="province">Provincia/Estado</Label>
              <Input
                id="province"
                name="province"
                placeholder="Madrid"
                value={formData.province}
                onChange={handleInputChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="country_id">País de Residencia</Label>
            <Select
              value={formData.country_id}
              onValueChange={(value) => handleSelectChange("country_id", value)}
              disabled={isLoadingCountries || isSubmitting}
            >
              <SelectTrigger id="country_id">
                <SelectValue placeholder="Selecciona un país" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.id} value={country.id}>
                    {country.name_en || country.name_es || "País desconocido"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Perfil y Nacionalidad */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Perfil y Nacionalidad</h3>

          <div>
            <Label htmlFor="profile_type">Tipo de Perfil *</Label>
            <Select
              value={formData.profile_type}
              onValueChange={(value) => handleSelectChange("profile_type", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="profile_type">
                <SelectValue placeholder="Selecciona un tipo de perfil" />
              </SelectTrigger>
              <SelectContent>
                {PROFILE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.profile_type && <span className="text-xs text-red-500">{errors.profile_type}</span>}
          </div>

          <div>
            <Label htmlFor="nationality_ids" className="block text-sm font-medium mb-2">
              Nacionalidad <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNationalityDropdown(!showNationalityDropdown)}
                disabled={isSubmitting || isLoadingCountries}
                className="w-full px-3 py-2 text-left border rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className="text-sm">
                  {formData.nationality_ids.length === 0
                    ? "Selecciona nacionalidades"
                    : `${formData.nationality_ids.length} nacionalidad(es) seleccionada(s)`}
                </span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {showNationalityDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {isLoadingCountries ? (
                    <p className="p-3 text-sm text-gray-500">Cargando nacionalidades...</p>
                  ) : countries.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500">No se encontraron países</p>
                  ) : (
                    <div className="p-2 space-y-1">
                      {countries.map((country) => (
                        <label
                          key={country.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.nationality_ids.includes(country.id)}
                            onChange={() => handleNationalityChange(country.id)}
                            disabled={isSubmitting || isLoadingCountries}
                            className="h-4 w-4 rounded"
                          />
                          <span className="text-sm flex-1">
                            {country.name_en || country.name_es || "País desconocido"}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.nationality_ids && (
              <span className="text-xs text-red-500 mt-1 block">{errors.nationality_ids}</span>
            )}
          </div>
        </div>

        {/* Error de envío */}
        {errors.submit && (
          <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Botón de envío */}
        <Button type="submit" disabled={isSubmitting || isLoadingCountries} className="w-full" size="lg">
          {isSubmitting ? "Creando cuenta..." : "Crear Cuenta"}
        </Button>
      </form>

      {/* Modal de duplicados */}
      <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitud Duplicada</DialogTitle>
            <DialogDescription>
              Se encontraron {duplicateError?.duplicates?.length || 0} solicitud(es) similar(es) en el sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {duplicateError?.duplicates?.map((dup, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium">
                  {dup.first_name} {dup.last_name}
                </p>
                <p className="text-gray-600">{dup.email}</p>
                <p className="text-gray-500 text-xs">Creado: {new Date(dup.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowDuplicateModal(false)}>
              Intentar nuevamente
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                window.location.href = `mailto:soporte@urbix.es?subject=Solicitud Duplicada ${formData.email}`
              }}
            >
              Contactar Soporte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
