"use client"

import { memo } from "react"
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface WorkflowEdgeData {
  label?: string
  onDelete?: () => void
}

function WorkflowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps<WorkflowEdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        }}
      />
      {(data?.label || selected) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            {data?.label && (
              <span className="rounded bg-background px-2 py-1 text-xs font-medium shadow-sm border">{data.label}</span>
            )}
            {selected && data?.onDelete && (
              <Button variant="destructive" size="icon" className="ml-1 h-5 w-5" onClick={data.onDelete}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const WorkflowEdge = memo(WorkflowEdgeComponent)
