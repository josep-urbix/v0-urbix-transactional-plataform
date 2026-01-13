"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { RefreshCw, X, Layers, List } from "lucide-react"

interface TransactionsFiltersProps {
  onRefresh?: () => void
  onToggleView?: () => void
  viewMode?: "grouped" | "individual"
  isLoading?: boolean
}

export function TransactionsFilters({
  onRefresh,
  onToggleView,
  viewMode = "grouped",
  isLoading = false,
}: TransactionsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== "ALL_STATUSES" && value !== "ALL_TYPES") {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set("page", "1")
    router.push(`/dashboard/transactions?${params.toString()}`)
  }

  const handleDateChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set("page", "1")
    router.push(`/dashboard/transactions?${params.toString()}`)
  }

  const handleQuickDateFilter = (preset: string) => {
    const now = new Date()
    let dateFrom: Date
    let dateTo = now

    switch (preset) {
      case "last_minute":
        dateFrom = new Date(now.getTime() - 60 * 1000)
        break
      case "last_15_minutes":
        dateFrom = new Date(now.getTime() - 15 * 60 * 1000)
        break
      case "last_30_minutes":
        dateFrom = new Date(now.getTime() - 30 * 60 * 1000)
        break
      case "last_hour":
        dateFrom = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case "last_day":
        dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case "yesterday":
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        yesterday.setHours(0, 0, 0, 0)
        dateFrom = yesterday
        dateTo = new Date(yesterday)
        dateTo.setHours(23, 59, 59, 999)
        break
      case "last_week":
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "last_month":
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set("from", dateFrom.toISOString())
    params.set("to", dateTo.toISOString())
    params.set("page", "1")
    router.push(`/dashboard/transactions?${params.toString()}`)
  }

  const handleClear = () => {
    window.location.href = "/dashboard/transactions"
  }

  const handleRefreshClick = () => {
    console.log("[v0] Refresh button clicked")
    if (onRefresh) {
      console.log("[v0] Calling onRefresh function")
      onRefresh()
    } else {
      console.log("[v0] onRefresh function not provided")
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <Select
            value={searchParams.get("status") || "ALL_STATUSES"}
            onValueChange={(value) => handleFilterChange("status", value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_STATUSES">Todos los estados</SelectItem>
              <SelectItem value="SUCCESS">Exitoso</SelectItem>
              <SelectItem value="ERROR">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>
          <Select
            value={searchParams.get("type") || "ALL_TYPES"}
            onValueChange={(value) => handleFilterChange("type", value)}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL_TYPES">Todos los tipos</SelectItem>
              <SelectItem value="WEBHOOK_MEETING_CREATED">Webhook - Reunión Creada</SelectItem>
              <SelectItem value="WEBHOOK_HEADERS_RECEIVED">Webhook - Headers Recibidos</SelectItem>
              <SelectItem value="HUBSPOT_SEARCH_MEETING">HubSpot - Buscar Reunión</SelectItem>
              <SelectItem value="HUBSPOT_GET_ENGAGEMENT_MEETING">HubSpot - Obtener Engagement</SelectItem>
              <SelectItem value="HUBSPOT_UPDATE_CONTACT">HubSpot - Actualizar Contacto</SelectItem>
              <SelectItem value="WEBHOOK_URLS_EXTRACTED">Webhook - URLs Extraídas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">Email del Cliente</Label>
          <Input
            id="contactEmail"
            type="email"
            placeholder="Buscar por email..."
            value={searchParams.get("contactEmail") || ""}
            onChange={(e) => handleFilterChange("contactEmail", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Filtros Rápidos de Fecha</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter("last_minute")}
            className="bg-transparent"
          >
            Último minuto
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter("last_15_minutes")}
            className="bg-transparent"
          >
            Últimos 15 minutos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter("last_30_minutes")}
            className="bg-transparent"
          >
            Últimos 30 minutos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter("last_hour")}
            className="bg-transparent"
          >
            Última hora
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter("last_day")}
            className="bg-transparent"
          >
            Último día
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter("yesterday")}
            className="bg-transparent"
          >
            Ayer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter("last_week")}
            className="bg-transparent"
          >
            Última semana
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleQuickDateFilter("last_month")}
            className="bg-transparent"
          >
            Último mes
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dateFrom">Fecha desde</Label>
          <Input
            id="dateFrom"
            type="datetime-local"
            value={searchParams.get("from") || ""}
            onChange={(e) => handleDateChange("from", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateTo">Fecha hasta</Label>
          <Input
            id="dateTo"
            type="datetime-local"
            value={searchParams.get("to") || ""}
            onChange={(e) => handleDateChange("to", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {onRefresh && (
          <Button variant="outline" onClick={handleRefreshClick} disabled={isLoading} className="gap-2 bg-transparent">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        )}
        {onToggleView && (
          <Button variant={viewMode === "grouped" ? "default" : "outline"} onClick={onToggleView} className="gap-2">
            {viewMode === "grouped" ? (
              <>
                <Layers className="h-4 w-4" />
                Agrupadas
              </>
            ) : (
              <>
                <List className="h-4 w-4" />
                Individuales
              </>
            )}
          </Button>
        )}
        <Button variant="outline" onClick={handleClear} className="gap-2 bg-transparent">
          <X className="h-4 w-4" />
          Limpiar Filtros
        </Button>
      </div>
    </div>
  )
}
