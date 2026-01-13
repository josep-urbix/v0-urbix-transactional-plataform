"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface BuildInfo {
  version: string
  buildDate: string
  commitSha: string
  environment: string
}

export function VersionInfo() {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null)

  useEffect(() => {
    fetch("/api/system/version")
      .then((res) => res.json())
      .then((data) => setBuildInfo(data))
      .catch(() => {
        setBuildInfo({
          version: "0.1.0",
          buildDate: new Date().toISOString().split("T")[0],
          commitSha: "unknown",
          environment: "production",
        })
      })
  }, [])

  if (!buildInfo) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-xs text-muted-foreground cursor-help">
            <span>v{buildInfo.version}</span>
            <Badge variant="outline" className="text-xs">
              {buildInfo.commitSha}
            </Badge>
            {buildInfo.environment !== "production" && (
              <Badge variant="secondary" className="text-xs">
                {buildInfo.environment}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <div>
              <span className="font-semibold">Version:</span> {buildInfo.version}
            </div>
            <div>
              <span className="font-semibold">Build:</span> {buildInfo.commitSha}
            </div>
            <div>
              <span className="font-semibold">Date:</span> {buildInfo.buildDate}
            </div>
            <div>
              <span className="font-semibold">Environment:</span> {buildInfo.environment}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
