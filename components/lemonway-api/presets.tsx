"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Trash2, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Preset {
  id: string
  name: string
  parameters: any
  created_at: string
}

interface PresetsProps {
  methodId: string
}

export function LemonwayPresets({ methodId }: PresetsProps) {
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newPresetName, setNewPresetName] = useState("")
  const [newPresetParams, setNewPresetParams] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchPresets()
  }, [methodId])

  const fetchPresets = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/lemonway-api/presets?method_id=${methodId}`)
      if (!res.ok) throw new Error("Error al cargar presets")

      const data = await res.json()
      setPresets(data.presets)
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

  const handleCreatePreset = async () => {
    if (!newPresetName.trim() || !newPresetParams.trim()) {
      toast({
        title: "Error",
        description: "El nombre y los parámetros son obligatorios",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const parameters = JSON.parse(newPresetParams)

      const res = await fetch("/api/lemonway-api/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method_id: methodId,
          name: newPresetName,
          parameters,
        }),
      })

      if (!res.ok) throw new Error("Error al crear preset")

      const data = await res.json()
      setPresets([...presets, data.preset])
      setNewPresetName("")
      setNewPresetParams("")
      setDialogOpen(false)

      toast({
        title: "Preset creado",
        description: "El preset se ha guardado correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePreset = async (presetId: string) => {
    try {
      const res = await fetch(`/api/lemonway-api/presets/${presetId}`, {
        method: "DELETE",
      })

      if (!res.ok) throw new Error("Error al eliminar preset")

      setPresets(presets.filter((p) => p.id !== presetId))

      toast({
        title: "Preset eliminado",
        description: "El preset se ha eliminado correctamente",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleLoadPreset = (parameters: any) => {
    // This would typically set the parameters in the parent component
    // For now, we'll just copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(parameters, null, 2))
    toast({
      title: "Copiado al portapapeles",
      description: "Los parámetros del preset se han copiado",
    })
  }

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
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Presets Guardados</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Preset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Preset</DialogTitle>
                <DialogDescription>
                  Guarda una configuración de parámetros para reutilizarla posteriormente
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="preset-name">Nombre del Preset</Label>
                  <Input
                    id="preset-name"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="Ej: Test de producción"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preset-params">Parámetros (JSON)</Label>
                  <Textarea
                    id="preset-params"
                    value={newPresetParams}
                    onChange={(e) => setNewPresetParams(e.target.value)}
                    className="font-mono text-sm min-h-[200px]"
                    placeholder='{"param1": "value1"}'
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreatePreset} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Preset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-3">
          {presets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No hay presets guardados para este método</div>
          ) : (
            presets.map((preset) => (
              <div key={preset.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{preset.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Creado: {new Date(preset.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleLoadPreset(preset.parameters)}>
                      <Download className="h-4 w-4 mr-1" />
                      Cargar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeletePreset(preset.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground">Ver parámetros</summary>
                  <Textarea
                    value={JSON.stringify(preset.parameters, null, 2)}
                    readOnly
                    className="font-mono text-xs min-h-[100px] mt-2"
                  />
                </details>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
