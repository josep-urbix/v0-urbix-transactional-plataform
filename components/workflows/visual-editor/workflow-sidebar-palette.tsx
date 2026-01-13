"use client"

import type React from "react"

import { useState } from "react"
import { Globe, Webhook, Mail, Clock, GitBranch, Variable, FileText, GripVertical, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { WorkflowStepType } from "@/lib/types/workflow"

interface StepDefinition {
  type: WorkflowStepType
  label: string
  description: string
  icon: React.ElementType
  color: string
  category: "action" | "flow" | "integration"
}

const stepDefinitions: StepDefinition[] = [
  {
    type: "CALL_INTERNAL_API",
    label: "API Interna",
    description: "Llama a una API interna del sistema",
    icon: Globe,
    color: "bg-blue-500",
    category: "integration",
  },
  {
    type: "CALL_WEBHOOK",
    label: "Webhook",
    description: "Llama a un webhook externo",
    icon: Webhook,
    color: "bg-purple-500",
    category: "integration",
  },
  {
    type: "SEND_EMAIL",
    label: "Enviar Email",
    description: "Envía un correo electrónico",
    icon: Mail,
    color: "bg-pink-500",
    category: "action",
  },
  {
    type: "DELAY",
    label: "Esperar",
    description: "Pausa la ejecución por un tiempo",
    icon: Clock,
    color: "bg-amber-500",
    category: "flow",
  },
  {
    type: "CONDITIONAL",
    label: "Condición",
    description: "Bifurcación según una condición",
    icon: GitBranch,
    color: "bg-orange-500",
    category: "flow",
  },
  {
    type: "SET_VARIABLE",
    label: "Variable",
    description: "Define o modifica una variable",
    icon: Variable,
    color: "bg-cyan-500",
    category: "flow",
  },
  {
    type: "LOG",
    label: "Log",
    description: "Registra información de debug",
    icon: FileText,
    color: "bg-slate-500",
    category: "action",
  },
]

interface WorkflowSidebarPaletteProps {
  onDragStart: (type: WorkflowStepType, label: string) => void
}

export function WorkflowSidebarPalette({ onDragStart }: WorkflowSidebarPaletteProps) {
  const [search, setSearch] = useState("")

  const filteredSteps = stepDefinitions.filter(
    (step) =>
      step.label.toLowerCase().includes(search.toLowerCase()) ||
      step.description.toLowerCase().includes(search.toLowerCase()),
  )

  const categories = [
    { id: "action", label: "Acciones" },
    { id: "integration", label: "Integraciones" },
    { id: "flow", label: "Control de Flujo" },
  ]

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      <div className="border-b p-3">
        <h3 className="mb-2 font-semibold">Pasos</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pasos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-3">
        {categories.map((category) => {
          const categorySteps = filteredSteps.filter((s) => s.category === category.id)
          if (categorySteps.length === 0) return null

          return (
            <div key={category.id} className="mb-4">
              <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">{category.label}</h4>
              <div className="space-y-2">
                {categorySteps.map((step) => (
                  <div
                    key={step.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/workflow-step", step.type)
                      e.dataTransfer.effectAllowed = "move"
                      onDragStart(step.type, step.label)
                    }}
                    className={cn(
                      "flex cursor-grab items-center gap-2 rounded-lg border bg-background p-2 transition-all",
                      "hover:border-primary hover:shadow-sm active:cursor-grabbing",
                    )}
                  >
                    <div className={cn("rounded-md p-1.5 text-white", step.color)}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                    </div>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {filteredSteps.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No se encontraron pasos</p>
        )}
      </ScrollArea>
    </div>
  )
}
