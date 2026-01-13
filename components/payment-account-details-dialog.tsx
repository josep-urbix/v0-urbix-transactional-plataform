"use client"

import type React from "react"
import { formatCurrency as formatCurrencyEU } from "@/lib/utils/currency"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, Mail, Phone, MapPin, Building, User, CreditCard, Shield, Database } from "lucide-react"
import type { PaymentAccount } from "@/lib/types/payment-account"
import useSWR from "swr"

interface Props {
  account: PaymentAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface FieldMapping {
  id: number
  endpoint: string
  table_name: string
  field_name: string
  field_value: string
  label: string
  target_field?: string
  color?: string
}

export function PaymentAccountDetailsDialog({ account, open, onOpenChange }: Props) {
  const { data: mappingsData } = useSWR("/api/lemonway/field-mappings", fetcher)

  const directMappings: Record<
    string,
    Record<string, Record<string, Record<string, { label: string; color?: string }>>>
  > = {}
  const crossFieldMappings: FieldMapping[] = []

  if (Array.isArray(mappingsData)) {
    console.log("[v0] Mappings data received:", mappingsData)
    mappingsData.forEach((mapping: FieldMapping) => {
      const endpoint = mapping.endpoint || "default"
      const tableName = mapping.table_name || "default"
      const fieldName = mapping.field_name
      const fieldValue = String(mapping.field_value)

      // If target_field exists and is different, it's a cross-field mapping
      if (mapping.target_field && mapping.target_field !== fieldName) {
        crossFieldMappings.push(mapping)
      } else {
        // Direct mapping to same field
        if (!directMappings[endpoint]) {
          directMappings[endpoint] = {}
        }
        if (!directMappings[endpoint][tableName]) {
          directMappings[endpoint][tableName] = {}
        }
        if (!directMappings[endpoint][tableName][fieldName]) {
          directMappings[endpoint][tableName][fieldName] = {}
        }
        directMappings[endpoint][tableName][fieldName][fieldValue] = {
          label: mapping.label,
          color: mapping.color,
        }
      }
    })
    console.log("[v0] Direct mappings:", directMappings)
    console.log("[v0] Cross-field mappings:", crossFieldMappings)
  }

  if (!account) return null

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return formatCurrencyEU(amount, currency)
  }

  const getFieldLabel = (
    fieldName: string,
    value: number | string | null | undefined,
  ): { label: string; color?: string } => {
    if (value === null || value === undefined) return { label: "N/A" }
    const valueStr = String(value)

    console.log(`[v0] getFieldLabel called for ${fieldName}=${valueStr}`)

    // First, check for cross-field mappings that target this field
    const crossMapping = crossFieldMappings.find((m) => {
      const sourceValue = account ? String((account as any)[m.field_name]) : null
      const matches = m.target_field === fieldName && sourceValue === m.field_value

      if (m.target_field === fieldName) {
        console.log(
          `[v0] Checking cross-field: ${m.field_name}=${m.field_value} → ${m.target_field}, source value=${sourceValue}, matches=${matches}`,
        )
      }

      return matches
    })

    if (crossMapping) {
      console.log(
        `[v0] Applied cross-field mapping: ${crossMapping.field_name}=${crossMapping.field_value} → ${fieldName}="${crossMapping.label}" (${crossMapping.color || "no color"})`,
      )
      return {
        label: crossMapping.label,
        color: crossMapping.color,
      }
    }

    // Then check direct mappings - try with full schema first, then fallback to without schema
    const directMapping =
      directMappings["accounts/retrieve"]?.["payments.payment_accounts"]?.[fieldName]?.[valueStr] ||
      directMappings["accounts/retrieve"]?.["payment_accounts"]?.[fieldName]?.[valueStr]

    if (directMapping) {
      console.log(`[v0] Applied direct mapping for ${fieldName}=${valueStr} → ${directMapping.label}`)
      return directMapping
    }

    // If no mapping, return original value
    console.log(`[v0] No mapping found for ${fieldName}=${valueStr}, returning original`)
    return { label: valueStr }
  }

  const renderFieldWithMapping = (label: string, fieldName: string, value: any, icon?: React.ReactNode) => {
    const { label: displayValue, color } = getFieldLabel(fieldName, value)

    const colorStyles = color
      ? {
          green: "bg-green-100 text-green-800 px-2 py-1 rounded",
          red: "bg-red-100 text-red-800 px-2 py-1 rounded",
          yellow: "bg-yellow-100 text-yellow-800 px-2 py-1 rounded",
          blue: "bg-blue-100 text-blue-800 px-2 py-1 rounded",
        }[color]
      : ""

    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <p className="mt-1 flex items-center gap-2">
          {icon}
          <span className={colorStyles}>{displayValue}</span>
        </p>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalles de Cuenta: {account.accountId}
          </DialogTitle>
          <DialogDescription>
            Información completa de la cuenta de pago incluyendo datos personales, balance y estado KYC.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Balance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <div className="mt-1">
                <Badge variant={account.status === "6" ? "default" : "secondary"}>
                  {getFieldLabel("status", account.status).label}
                </Badge>
                {account.isBlocked && (
                  <Badge variant="destructive" className="ml-2">
                    Bloqueada
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Saldo Disponible</label>
              <div className="mt-1 text-2xl font-bold">{formatCurrency(account.balance, account.currency)}</div>
            </div>
          </div>

          <Separator />

          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Información Personal
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Título</label>
                <p className="mt-1">{account.clientTitle || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                <p className="mt-1">{account.firstName || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Apellido</label>
                <p className="mt-1">{account.lastName || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {account.email || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Teléfono Fijo</label>
                <p className="mt-1 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {account.phoneNumber || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Teléfono Móvil</label>
                <p className="mt-1 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {account.mobileNumber || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nacionalidad</label>
                <p className="mt-1">{account.nationality || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</label>
                <p className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {account.birthDate ? new Date(account.birthDate).toLocaleDateString("es-ES") : "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ciudad de Nacimiento</label>
                <p className="mt-1">{account.birthCity || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">País de Nacimiento</label>
                <p className="mt-1">{account.birthCountry || "N/A"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Address Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Dirección
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Dirección</label>
                <p className="mt-1">{account.address || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Código Postal</label>
                <p className="mt-1">{account.postalCode || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ciudad</label>
                <p className="mt-1">{account.city || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">País</label>
                <p className="mt-1">{account.country || "N/A"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Company Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Información de Empresa
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nombre de Empresa</label>
                <p className="mt-1">{account.companyName || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Número de Identificación</label>
                <p className="mt-1">{account.companyIdentificationNumber || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Sitio Web</label>
                <p className="mt-1">
                  {account.companyWebsite ? (
                    <a
                      href={account.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {account.companyWebsite}
                    </a>
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                <p className="mt-1">{account.companyDescription || "N/A"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* KYC and Permissions */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              KYC y Permisos
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {renderFieldWithMapping("Estado KYC", "kycStatus", account.kycStatus)}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Es Deudor</label>
                <p className="mt-1">{account.isDebtor ? "Sí" : "No"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Está Bloqueada</label>
                <p className="mt-1">{account.isBlocked ? "Sí" : "No"}</p>
              </div>
              {renderFieldWithMapping("Pagador o Beneficiario", "payerOrBeneficiary", account.payerOrBeneficiary)}
            </div>
          </div>

          <Separator />

          {/* Technical Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Información Técnica
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID Base de Datos</label>
                <p className="mt-1">{account.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID Interno</label>
                <p className="mt-1">{account.internalId ?? "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Account ID</label>
                <p className="mt-1 font-mono text-xs">{account.accountId}</p>
              </div>
              {renderFieldWithMapping("Tipo de Cuenta", "accountType", account.accountType)}
              {renderFieldWithMapping("Estado", "status", account.status)}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Moneda</label>
                <p className="mt-1">{account.currency || "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Última Sincronización</label>
                <p className="mt-1">{account.lastSyncAt ? formatDate(account.lastSyncAt) : "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Creada</label>
                <p className="mt-1">{account.createdAt ? formatDate(account.createdAt) : "N/A"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Actualizada</label>
                <p className="mt-1">{account.updatedAt ? formatDate(account.updatedAt) : "N/A"}</p>
              </div>
            </div>
          </div>

          {account.metadata && Object.keys(account.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Metadata
                </h3>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(account.metadata, null, 2)}
                </pre>
              </div>
            </>
          )}

          {account.rawData && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Datos Crudos (Raw Data)
                </h3>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                  {JSON.stringify(account.rawData, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
