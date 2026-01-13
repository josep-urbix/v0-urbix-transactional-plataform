"use client"

import type React from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  MarkerType,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { nodeTypes } from "./nodes"
import { edgeTypes } from "./edges"

interface WorkflowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  onNodeClick: (event: React.MouseEvent, node: Node) => void
  onPaneClick: () => void
  onDrop: (event: React.DragEvent) => void
  onDragOver: (event: React.DragEvent) => void
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onPaneClick,
  onDrop,
  onDragOver,
}: WorkflowCanvasProps) {
  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: "workflow",
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: true,
        }}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        connectionLineStyle={{ stroke: "hsl(var(--primary))", strokeWidth: 2 }}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Shift"]}
        selectionKeyCode={["Shift"]}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={15} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            if (node.type === "trigger") return "#10b981"
            return "#6366f1"
          }}
          className="!bg-background !border"
        />
        <Panel position="top-center" className="!top-2">
          <div className="rounded-lg border bg-background/80 px-4 py-2 text-sm backdrop-blur">
            Arrastra pasos desde la paleta izquierda • Click para seleccionar • Delete para eliminar
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
