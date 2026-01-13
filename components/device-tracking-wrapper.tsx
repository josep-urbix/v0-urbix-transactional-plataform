"use client"

import { useDeviceTracking } from "@/hooks/use-device-tracking"

export function DeviceTrackingWrapper() {
  useDeviceTracking()
  return null
}
