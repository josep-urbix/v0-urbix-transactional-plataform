import { Suspense } from "react"
import { DeviceTrackingSettings } from "@/components/settings/device-tracking-settings"

export const metadata = {
  title: "Device Tracking - Settings",
  description: "Configure device tracking and security settings",
}

export default function DeviceTrackingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Device Tracking</h1>
        <p className="text-muted-foreground mt-2">Configure how devices are tracked and monitored for security</p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <DeviceTrackingSettings />
      </Suspense>
    </div>
  )
}
