"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Loader2, Save, Clock, Shield, ShieldCheck, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function DeviceTrackingSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [config, setConfig] = useState({
    enabled: true,
    intervalBasic: 10, // minutos
    intervalStandard: 30, // minutos
  })

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const res = await fetch("/api/admin/settings/device-tracking")
      if (res.ok) {
        const data = await res.json()
        setConfig({
          enabled: data.enabled,
          intervalBasic: Math.round(data.intervalBasic / 60000), // ms a minutos
          intervalStandard: Math.round(data.intervalStandard / 60000),
        })
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/settings/device-tracking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: config.enabled,
          intervalBasic: config.intervalBasic * 60000, // minutos a ms
          intervalStandard: config.intervalStandard * 60000,
        }),
      })

      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully" })
      } else {
        setMessage({ type: "error", text: "Failed to save settings" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="tracking-enabled" className="text-base font-semibold">
                  Enable Device Tracking
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically track and monitor user devices for security
                </p>
              </div>
              <Switch
                id="tracking-enabled"
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            {!config.enabled && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> Device tracking is disabled. User devices will not be monitored, and
                  security features like device verification and anomaly detection will not function.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className={`border-t pt-6 space-y-6 ${!config.enabled ? "opacity-50 pointer-events-none" : ""}`}>
            <div className="flex items-start gap-4">
              <Clock className="h-5 w-5 text-muted-foreground mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="interval-basic" className="font-semibold">
                  Basic Device Update Interval
                </Label>
                <p className="text-sm text-muted-foreground">
                  How often to update device information for users without 2FA
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    id="interval-basic"
                    type="number"
                    min="1"
                    max="60"
                    value={config.intervalBasic}
                    onChange={(e) => setConfig({ ...config, intervalBasic: Number.parseInt(e.target.value) || 1 })}
                    className="w-24"
                    disabled={!config.enabled}
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <ShieldCheck className="h-5 w-5 text-muted-foreground mt-1" />
              <div className="flex-1 space-y-2">
                <Label htmlFor="interval-standard" className="font-semibold">
                  Enhanced Trust Update Interval (2FA)
                </Label>
                <p className="text-sm text-muted-foreground">
                  How often to update device information for users with 2FA enabled
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    id="interval-standard"
                    type="number"
                    min="1"
                    max="120"
                    value={config.intervalStandard}
                    onChange={(e) => setConfig({ ...config, intervalStandard: Number.parseInt(e.target.value) || 1 })}
                    className="w-24"
                    disabled={!config.enabled}
                  />
                  <span className="text-sm text-muted-foreground">minutes</span>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-muted/50">
        <div className="flex items-start gap-4">
          <Shield className="h-5 w-5 text-muted-foreground mt-1" />
          <div className="space-y-2">
            <h3 className="font-semibold">Trust Levels</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • <strong>Basic:</strong> Users without 2FA - tracked every {config.intervalBasic} minutes
              </li>
              <li>
                • <strong>Standard:</strong> Users with 2FA enabled - tracked every {config.intervalStandard} minutes
              </li>
              <li>
                • <strong>High:</strong> Manually trusted devices - same as Standard
              </li>
              <li>
                • <strong>Verified:</strong> Devices with 30+ days of usage - same as Standard
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  )
}
