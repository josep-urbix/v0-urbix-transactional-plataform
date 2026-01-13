"use client"

import type React from "react"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Zap, Calendar, Webhook, Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface TriggerNodeData {
  name: string
  triggerType: string
  config: Record<string, unknown>
  isSelected?: boolean
}

const triggerIcons: Record<string, React.ElementType> = {
  EVENT: Zap,
  SCHEDULE: Calendar,
  WEBHOOK: Webhook,
  MANUAL: Play,
}

function TriggerNodeComponent({ data, selected }: NodeProps<TriggerNodeData>) {
  const Icon = triggerIcons[data.triggerType] || Zap

  return (
    <div
      className={cn(
        "relative min-w-[200px] rounded-lg border-2 bg-background shadow-md transition-all",
        selected ? "border-primary ring-2 ring-primary/20" : "border-emerald-500",
        "hover:shadow-lg",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 rounded-t-md bg-emerald-500 px-3 py-2 text-white">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">Trigger</span>
      </div>

      {/* Body */}
      <div className="p-3">
        <p className="text-sm font-medium">{data.name || "Sin nombre"}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {data.triggerType?.toLowerCase().replace("_", " ") || "Evento"}
        </p>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-emerald-500 !bg-background"
      />
    </div>
  )
}

export const TriggerNode = memo(TriggerNodeComponent)
