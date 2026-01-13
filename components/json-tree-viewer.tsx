"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface JsonTreeViewerProps {
  data: any
  label: string
}

export function JsonTreeViewer({ data, label }: JsonTreeViewerProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  let parsedData: any
  try {
    parsedData = typeof data === "string" ? JSON.parse(data) : data
  } catch (e) {
    parsedData = data
  }

  const copyToClipboard = (value: string, path: string) => {
    navigator.clipboard.writeText(value)
    setCopiedPath(path)
    setTimeout(() => setCopiedPath(null), 2000)
  }

  return (
    <div className="space-y-2 border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-gradient-to-r from-slate-100 to-slate-50 px-4 py-2.5 border-b border-slate-200">
        <p className="font-semibold text-sm text-slate-800">{label}</p>
        <Badge variant="secondary" className="text-xs font-mono bg-white border border-slate-300">
          JSON
        </Badge>
      </div>
      <ScrollArea className="h-[500px] w-full">
        <div className="p-4 bg-slate-50">
          <JsonNode data={parsedData} path="" copyToClipboard={copyToClipboard} copiedPath={copiedPath} />
        </div>
      </ScrollArea>
    </div>
  )
}

interface JsonNodeProps {
  data: any
  path: string
  depth?: number
  copyToClipboard: (value: string, path: string) => void
  copiedPath: string | null
}

function JsonNode({ data, path, depth = 0, copyToClipboard, copiedPath }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2) // Auto-expand first 2 levels

  if (data === null) {
    return <ValueNode value="null" type="null" path={path} copyToClipboard={copyToClipboard} copiedPath={copiedPath} />
  }

  if (data === undefined) {
    return (
      <ValueNode
        value="undefined"
        type="undefined"
        path={path}
        copyToClipboard={copyToClipboard}
        copiedPath={copiedPath}
      />
    )
  }

  const type = typeof data

  if (type === "string" || type === "number" || type === "boolean") {
    return <ValueNode value={data} type={type} path={path} copyToClipboard={copyToClipboard} copiedPath={copiedPath} />
  }

  if (Array.isArray(data)) {
    return (
      <div className="font-mono text-xs">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 hover:bg-slate-200 rounded px-1 py-0.5 transition-colors group"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-slate-600" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-600" />
          )}
          <span className="text-blue-700 font-semibold">Array</span>
          <span className="text-slate-500 text-[10px]">({data.length} items)</span>
        </button>
        {isExpanded && (
          <div className="ml-4 border-l-2 border-slate-300 pl-3 mt-1 space-y-1">
            {data.map((item, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-slate-500 font-semibold min-w-[30px]">[{index}]</span>
                <JsonNode
                  data={item}
                  path={`${path}[${index}]`}
                  depth={depth + 1}
                  copyToClipboard={copyToClipboard}
                  copiedPath={copiedPath}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (type === "object") {
    const keys = Object.keys(data)
    return (
      <div className="font-mono text-xs">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 hover:bg-slate-200 rounded px-1 py-0.5 transition-colors group"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-slate-600" />
          ) : (
            <ChevronRight className="h-3 w-3 text-slate-600" />
          )}
          <span className="text-purple-700 font-semibold">Object</span>
          <span className="text-slate-500 text-[10px]">({keys.length} keys)</span>
        </button>
        {isExpanded && (
          <div className="ml-4 border-l-2 border-slate-300 pl-3 mt-1 space-y-1">
            {keys.map((key) => (
              <div key={key} className="flex gap-2 items-start">
                <span className="text-emerald-700 font-semibold min-w-fit whitespace-nowrap">{key}:</span>
                <JsonNode
                  data={data[key]}
                  path={path ? `${path}.${key}` : key}
                  depth={depth + 1}
                  copyToClipboard={copyToClipboard}
                  copiedPath={copiedPath}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return <span className="text-slate-600 italic">unknown type</span>
}

interface ValueNodeProps {
  value: any
  type: string
  path: string
  copyToClipboard: (value: string, path: string) => void
  copiedPath: string | null
}

function ValueNode({ value, type, path, copyToClipboard, copiedPath }: ValueNodeProps) {
  const isCopied = copiedPath === path

  const getValueColor = () => {
    switch (type) {
      case "string":
        return "text-amber-700"
      case "number":
        return "text-blue-600"
      case "boolean":
        return "text-pink-600"
      case "null":
        return "text-slate-500"
      default:
        return "text-slate-600"
    }
  }

  const getFormattedValue = () => {
    if (type === "string") {
      // Truncate very long strings for display
      if (value.length > 200) {
        return `"${value.substring(0, 200)}..."`
      }
      return `"${value}"`
    }
    return String(value)
  }

  return (
    <div className="inline-flex items-center gap-2 group">
      <span className={cn("font-mono text-xs break-all", getValueColor())}>{getFormattedValue()}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => copyToClipboard(String(value), path)}
        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {isCopied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      </Button>
    </div>
  )
}
