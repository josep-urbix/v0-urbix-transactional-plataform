"use client"

import type React from "react"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Globe, Webhook, Mail, Clock, GitBranch, Variable, FileText, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkflowStepType } from "@/lib/types/workflow"

interface StepNodeData {
  stepId?: string
  stepType: WorkflowStepType
  name: string
  config: Record<string, unknown>
  isSelected?: boolean
}

const stepIcons: Record<WorkflowStepType, React.ElementType> = {
  CALL_INTERNAL_API: Globe,
  CALL_WEBHOOK: Webhook,
  SEND_EMAIL: Mail,
  DELAY: Clock,
  CONDITIONAL: GitBranch,
  SET_VARIABLE: Variable,
  LOG: FileText,
}

const stepColors: Record<WorkflowStepType, { border: string; bg: string }> = {
  CALL_INTERNAL_API: { border: "border-blue-500", bg: "bg-blue-500" },
  CALL_WEBHOOK: { border: "border-purple-500", bg: "bg-purple-500" },
  SEND_EMAIL: { border: "border-pink-500", bg: "bg-pink-500" },
  DELAY: { border: "border-amber-500", bg: "bg-amber-500" },
  CONDITIONAL: { border: "border-orange-500", bg: "bg-orange-500" },
  SET_VARIABLE: { border: "border-cyan-500", bg: "bg-cyan-500" },
  LOG: { border: "border-slate-500", bg: "bg-slate-500" },
}

const stepLabels: Record<WorkflowStepType, string> = {
  CALL_INTERNAL_API: "API Interna",
  CALL_WEBHOOK: "Webhook",
  SEND_EMAIL: "Enviar Email",
  DELAY: "Esperar",
  CONDITIONAL: "Condición",
  SET_VARIABLE: "Variable",
  LOG: "Log",
}

function StepNodeComponent({ data, selected }: NodeProps<StepNodeData>) {
  const Icon = stepIcons[data.stepType] || HelpCircle
  const colors = stepColors[data.stepType] || { border: "border-gray-500", bg: "bg-gray-500" }
  const label = stepLabels[data.stepType] || data.stepType
  const isConditional = data.stepType === "CONDITIONAL"

  return (
    <div
      className={cn(
        "relative min-w-[200px] rounded-lg border-2 bg-background shadow-md transition-all",
        selected ? "border-primary ring-2 ring-primary/20" : colors.border,
        "hover:shadow-lg",
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn("!h-3 !w-3 !border-2 !bg-background", `!${colors.border}`)}
      />

      {/* Header */}
      <div className={cn("flex items-center gap-2 rounded-t-md px-3 py-2 text-white", colors.bg)}>
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>

      {/* Body */}
      <div className="p-3">
        <p className="text-sm font-medium">{data.name || "Sin nombre"}</p>
        {data.stepType === "DELAY" && data.config?.delayMs && (
          <p className="text-xs text-muted-foreground">{Math.round(Number(data.config.delayMs) / 1000)}s de espera</p>
        )}
        {data.stepType === "SEND_EMAIL" && data.config?.templateKey && (
          <p className="text-xs text-muted-foreground">Template: {String(data.config.templateKey)}</p>
        )}
        {data.stepType === "CALL_INTERNAL_API" && data.config?.endpoint && (
          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
            {String(data.config.method || "GET")} {String(data.config.endpoint)}
          </p>
        )}
      </div>

      {/* Output Handles */}
      {isConditional ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!left-[30%] !h-3 !w-3 !border-2 !border-green-500 !bg-background"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!left-[70%] !h-3 !w-3 !border-2 !border-red-500 !bg-background"
          />
          <div className="absolute -bottom-6 left-[30%] -translate-x-1/2 text-xs text-green-600">Sí</div>
          <div className="absolute -bottom-6 left-[70%] -translate-x-1/2 text-xs text-red-600">No</div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className={cn("!h-3 !w-3 !border-2 !bg-background", `!${colors.border}`)}
        />
      )}
    </div>
  )
}

export const StepNode = memo(StepNodeComponent)
