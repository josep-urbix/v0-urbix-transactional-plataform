"use client"

import type React from "react"

import { useState, useCallback, useMemo } from "react"
import { useNodesState, useEdgesState, addEdge, type Node, type Edge, type Connection, MarkerType } from "@xyflow/react"
import type { Workflow, WorkflowStep, WorkflowStepType } from "@/lib/types/workflow"

interface UseWorkflowCanvasOptions {
  workflow: Workflow | null
  steps: WorkflowStep[]
}

export function useWorkflowCanvas({ workflow, steps }: UseWorkflowCanvasOptions) {
  // Convertir workflow existente a nodos y edges
  const initialNodes = useMemo<Node[]>(() => {
    const nodes: Node[] = []

    nodes.push({
      id: "trigger",
      type: "trigger",
      position: { x: 250, y: 50 },
      data: {
        name: workflow?.name || "Nuevo Workflow",
        triggerType: workflow?.triggerType || "EVENT",
        config: workflow?.triggerConfig || {},
      },
    })

    // Nodos de pasos
    steps.forEach((step, index) => {
      nodes.push({
        id: step.id,
        type: "step",
        position: { x: 250, y: 200 + index * 150 },
        data: {
          stepId: step.id,
          stepType: step.type as WorkflowStepType,
          name: step.name,
          config: step.config || {},
        },
      })
    })

    return nodes
  }, [workflow, steps])

  const initialEdges = useMemo<Edge[]>(() => {
    const edges: Edge[] = []

    // Conectar trigger al primer paso
    if (steps.length > 0) {
      edges.push({
        id: `trigger-${steps[0].id}`,
        source: "trigger",
        target: steps[0].id,
        type: "workflow",
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
      })
    }

    // Conectar pasos en orden
    steps.forEach((step, index) => {
      if (step.nextStepId) {
        edges.push({
          id: `${step.id}-${step.nextStepId}`,
          source: step.id,
          target: step.nextStepId,
          type: "workflow",
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: true,
        })
      } else if (index < steps.length - 1) {
        // Conectar al siguiente paso por orden si no hay nextStepId
        edges.push({
          id: `${step.id}-${steps[index + 1].id}`,
          source: step.id,
          target: steps[index + 1].id,
          type: "workflow",
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: true,
        })
      }

      // Conexiones condicionales
      if (step.type === "CONDITIONAL") {
        const config = step.config as { trueStepId?: string; falseStepId?: string }
        if (config.trueStepId) {
          edges.push({
            id: `${step.id}-true-${config.trueStepId}`,
            source: step.id,
            sourceHandle: "true",
            target: config.trueStepId,
            type: "workflow",
            label: "Sí",
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: true,
          })
        }
        if (config.falseStepId) {
          edges.push({
            id: `${step.id}-false-${config.falseStepId}`,
            source: step.id,
            sourceHandle: "false",
            target: config.falseStepId,
            type: "workflow",
            label: "No",
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: true,
          })
        }
      }
    })

    return edges
  }, [steps])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null
  }, [nodes, selectedNodeId])

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: `${connection.source}-${connection.sourceHandle || "out"}-${connection.target}`,
        type: "workflow",
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
        label: connection.sourceHandle === "true" ? "Sí" : connection.sourceHandle === "false" ? "No" : undefined,
      } as Edge
      setEdges((eds) => addEdge(edge, eds))
    },
    [setEdges],
  )

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const addNode = useCallback(
    (type: WorkflowStepType, label: string, position: { x: number; y: number }) => {
      const newNode: Node = {
        id: `step-${Date.now()}`,
        type: "step",
        position,
        data: {
          stepType: type,
          name: label,
          config: {},
        },
      }
      setNodes((nds) => [...nds, newNode])
      setSelectedNodeId(newNode.id)
    },
    [setNodes],
  )

  const updateNode = useCallback(
    (nodeId: string, data: Partial<Node["data"]>) => {
      setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)))
    },
    [setNodes],
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      if (nodeId === "trigger") return // No eliminar trigger
      setNodes((nds) => nds.filter((node) => node.id !== nodeId))
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
      setSelectedNodeId(null)
    },
    [setNodes, setEdges],
  )

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  // Convertir de vuelta a formato de workflow para guardar
  const toWorkflowData = useCallback(() => {
    const triggerNode = nodes.find((n) => n.type === "trigger")
    const stepNodes = nodes.filter((n) => n.type === "step")

    // Calcular orden de pasos basado en conexiones
    const stepsData = stepNodes.map((node, index) => {
      // Encontrar el edge que sale de este nodo
      const outgoingEdge = edges.find((e) => e.source === node.id && !e.sourceHandle)
      const trueEdge = edges.find((e) => e.source === node.id && e.sourceHandle === "true")
      const falseEdge = edges.find((e) => e.source === node.id && e.sourceHandle === "false")

      const config = { ...node.data.config }
      if (trueEdge) config.trueStepId = trueEdge.target
      if (falseEdge) config.falseStepId = falseEdge.target

      return {
        id: node.data.stepId || node.id,
        type: node.data.stepType,
        name: node.data.name,
        config,
        order: index,
        nextStepId: outgoingEdge?.target || null,
      }
    })

    return {
      workflow: {
        name: triggerNode?.data.name || "Nuevo Workflow",
        triggerType: triggerNode?.data.triggerType || "EVENT",
        triggerConfig: triggerNode?.data.config || {},
      },
      steps: stepsData,
    }
  }, [nodes, edges])

  return {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onPaneClick,
    addNode,
    updateNode,
    deleteNode,
    clearSelection,
    toWorkflowData,
  }
}
