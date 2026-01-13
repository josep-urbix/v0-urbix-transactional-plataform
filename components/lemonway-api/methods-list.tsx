"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Method {
  id: string
  name: string
  category: string
  description: string
  is_enabled: boolean
  http_method: string
  endpoint: string
}

interface MethodsListProps {
  onMethodSelect: (methodId: string) => void
  selectedMethodId: string | null
}

export function LemonwayMethodsList({ onMethodSelect, selectedMethodId }: MethodsListProps) {
  const [methods, setMethods] = useState<Method[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchMethods()
  }, [])

  const fetchMethods = async () => {
    try {
      const res = await fetch("/api/lemonway-api/methods")
      if (!res.ok) throw new Error("Error al cargar métodos")
      const data = await res.json()
      setMethods(data.methods)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleMethod = async (methodId: string, currentState: boolean) => {
    setTogglingId(methodId)
    try {
      const res = await fetch(`/api/lemonway-api/methods/${methodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !currentState }),
      })

      if (!res.ok) throw new Error("Error al cambiar estado del método")

      const data = await res.json()
      setMethods((prev) => prev.map((m) => (m.id === methodId ? { ...m, is_enabled: !currentState } : m)))

      toast({
        title: "Estado actualizado",
        description: `Método ${!currentState ? "activado" : "desactivado"} correctamente`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setTogglingId(null)
    }
  }

  const filteredMethods = methods.filter((method) => {
    const search = String(searchQuery || "").toLowerCase()
    const matchesSearch =
      String(method.name || "")
        .toLowerCase()
        .includes(search) ||
      String(method.description || "")
        .toLowerCase()
        .includes(search)
    const matchesCategory = categoryFilter === "all" || method.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categories = ["all", ...Array.from(new Set(methods.map((m) => m.category)))]

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métodos Disponibles</CardTitle>
        <div className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar métodos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                variant={categoryFilter === category ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(category)}
              >
                {category === "all" ? "Todos" : category}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {filteredMethods.map((method) => (
          <div
            key={method.id}
            className={cn(
              "p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent",
              selectedMethodId === method.id && "bg-accent border-primary",
            )}
            onClick={() => onMethodSelect(method.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{method.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {method.http_method}
                  </Badge>
                </div>
                <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{method.endpoint}</code>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{method.description}</p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  {method.category}
                </Badge>
              </div>

              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {togglingId === method.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleMethod(method.id, method.is_enabled)}
                    className="h-8 w-8 p-0"
                  >
                    {method.is_enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredMethods.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">No se encontraron métodos</div>
        )}
      </CardContent>
    </Card>
  )
}
