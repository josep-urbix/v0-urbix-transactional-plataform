"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface ProcessMovementsButtonProps {
  onSuccess?: () => void
}

export function ProcessMovementsButton({ onSuccess }: ProcessMovementsButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleProcess = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/lemonway/process-movements", {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()

      toast({
        title: "Procesamiento completado",
        description: `Movimientos procesados: ${data.processed}, Errores: ${data.errors}`,
        variant: data.errors > 0 ? "destructive" : "default",
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al procesar movimientos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleProcess} disabled={loading}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? "Procesando..." : "Procesar Cola"}
    </Button>
  )
}
