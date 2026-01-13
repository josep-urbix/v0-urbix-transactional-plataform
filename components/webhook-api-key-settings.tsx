"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, RefreshCw } from "lucide-react"

interface KeyInfo {
  hasKey: boolean
  maskedKey?: string | null
  keySource?: "database" | "environment" | null
  updatedAt?: string | null
}

interface WebhookApiKeySettingsProps {
  initialKeyInfo: KeyInfo | null
}

export function WebhookApiKeySettings({ initialKeyInfo }: WebhookApiKeySettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(initialKeyInfo)

  const generateRandomKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let key = ""
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewKey(key)
  }

  const copyToClipboard = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      toast.success("API key copied to clipboard")
    }
  }

  const handleSave = async () => {
    if (!newKey.trim()) {
      toast.error("Please enter a valid API key")
      return
    }

    if (newKey.length < 16) {
      toast.error("API key must be at least 16 characters")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/settings/webhook-api-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newKey }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update API key")
      }

      // Refresh key info
      const infoResponse = await fetch("/api/settings/webhook-api-key")
      if (infoResponse.ok) {
        const updatedInfo = await infoResponse.json()
        setKeyInfo(updatedInfo)
      }

      toast.success("Webhook API key updated successfully")
      setNewKey("")
      setIsEditing(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update API key")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {keyInfo?.hasKey && (
        <div className="space-y-2">
          <Label>Current API Key</Label>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-muted px-3 py-2 rounded-md font-mono text-sm">{keyInfo.maskedKey}</code>
            <div className="text-xs text-muted-foreground">
              {keyInfo.keySource === "database" ? (
                <span className="bg-primary/10 text-primary px-2 py-1 rounded">Database</span>
              ) : (
                <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded">Environment</span>
              )}
            </div>
          </div>
          {keyInfo.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(keyInfo.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {keyInfo?.keySource === "environment" && (
        <Alert>
          <AlertDescription className="text-xs">
            Currently using the API key from environment variables. You can override it by configuring a new key below,
            which will be stored in the database and take precedence.
          </AlertDescription>
        </Alert>
      )}

      {!isEditing ? (
        <Button onClick={() => setIsEditing(true)} variant="outline">
          {keyInfo?.hasKey ? "Update API Key" : "Configure API Key"}
        </Button>
      ) : (
        <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="newKey">Webhook API Key</Label>
            <div className="flex gap-2">
              <Input
                id="newKey"
                type="text"
                placeholder="Enter API key (min 16 characters)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                disabled={isLoading}
                className="font-mono"
              />
              <Button type="button" variant="outline" size="icon" onClick={generateRandomKey} disabled={isLoading}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              {newKey && (
                <Button type="button" variant="outline" size="icon" onClick={copyToClipboard} disabled={isLoading}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              This key will be used to authenticate webhook requests from HubSpot. Include it as an{" "}
              <code className="bg-muted px-1 py-0.5 rounded">x-api-key</code> header in your webhook configuration.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save API Key"}
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
