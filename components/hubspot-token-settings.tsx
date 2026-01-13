"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface TokenInfo {
  hasToken: boolean
  maskedToken?: string | null
  tokenSource?: "database" | "environment" | null
  updatedAt?: string | null
}

interface HubSpotTokenSettingsProps {
  initialTokenInfo: TokenInfo | null
}

export function HubSpotTokenSettings({ initialTokenInfo }: HubSpotTokenSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newToken, setNewToken] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(initialTokenInfo)

  const handleSave = async () => {
    console.log("[v0] Starting token save, token length:", newToken.length)

    if (!newToken.trim()) {
      console.log("[v0] Token validation failed: empty token")
      toast.error("Please enter a valid token")
      return
    }

    setIsLoading(true)
    console.log("[v0] Making PUT request to /api/settings/hubspot-token")

    try {
      const response = await fetch("/api/settings/hubspot-token", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newToken }),
      })

      console.log("[v0] Response status:", response.status)

      if (!response.ok) {
        const error = await response.json()
        console.log("[v0] Error response:", error)
        throw new Error(error.error || "Failed to update token")
      }

      // Refresh token info
      console.log("[v0] Token saved, fetching updated info")
      const infoResponse = await fetch("/api/settings/hubspot-token")
      if (infoResponse.ok) {
        const updatedInfo = await infoResponse.json()
        console.log("[v0] Updated token info:", updatedInfo)
        setTokenInfo(updatedInfo)
      }

      toast.success("HubSpot access token updated successfully")
      setNewToken("")
      setIsEditing(false)
    } catch (error) {
      console.log("[v0] Token save error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update token")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {tokenInfo?.hasToken && (
        <div className="space-y-2">
          <Label>Current Token</Label>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-muted px-3 py-2 rounded-md font-mono text-sm">{tokenInfo.maskedToken}</code>
            <div className="text-xs text-muted-foreground">
              {tokenInfo.tokenSource === "database" ? (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded">Database</span>
              ) : (
                <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded">Environment</span>
              )}
            </div>
          </div>
          {tokenInfo.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(tokenInfo.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {tokenInfo?.tokenSource === "environment" && (
        <Alert>
          <AlertDescription className="text-xs">
            Currently using the token from environment variables. You can override it by configuring a new token below,
            which will be stored in the database and take precedence.
          </AlertDescription>
        </Alert>
      )}

      {!isEditing ? (
        <Button onClick={() => setIsEditing(true)} variant="outline">
          {tokenInfo?.hasToken ? "Update Token" : "Configure Token"}
        </Button>
      ) : (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="newToken">New HubSpot Access Token</Label>
            <Input
              id="newToken"
              type="password"
              placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              disabled={isLoading}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Enter your HubSpot Private App access token. This will be stored securely in the database.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Token"}
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
