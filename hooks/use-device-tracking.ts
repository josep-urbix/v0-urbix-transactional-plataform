"use client"

import { useEffect, useRef, useState } from "react"

export function useDeviceTracking(deviceFingerprint: string | null) {
  const [isTracking, setIsTracking] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [config, setConfig] = useState({
    enabled: true,
    intervalBasic: 600000, // 10 min
    intervalStandard: 1800000, // 30 min
  })
  const [trustLevel, setTrustLevel] = useState<string>("basic")

  // Cargar configuración al montar
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/devices/config")
        if (res.ok) {
          const data = await res.json()
          setConfig(data)
        }
      } catch (error) {
        console.error("Failed to load tracking config:", error)
      }
    }
    loadConfig()
  }, [])

  // Iniciar tracking cuando hay fingerprint y está habilitado
  useEffect(() => {
    if (!deviceFingerprint || !config.enabled) {
      return
    }

    const sendHeartbeat = async () => {
      try {
        const res = await fetch("/api/devices/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_fingerprint: deviceFingerprint }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.trust_level && data.trust_level !== trustLevel) {
            setTrustLevel(data.trust_level)

            // Reiniciar interval con nuevo trust level
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              startTracking(data.trust_level)
            }
          }
        }
      } catch (error) {
        console.error("Heartbeat failed:", error)
      }
    }

    const startTracking = (level: string) => {
      const interval = level === "standard" ? config.intervalStandard : config.intervalBasic

      // Enviar heartbeat inicial
      sendHeartbeat()

      // Configurar interval
      intervalRef.current = setInterval(sendHeartbeat, interval)
      setIsTracking(true)
    }

    // Pausar tracking cuando el tab está inactivo
    const handleVisibilityChange = () => {
      if (document.hidden && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
        setIsTracking(false)
      } else if (!document.hidden && !intervalRef.current) {
        startTracking(trustLevel)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    startTracking(trustLevel)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      setIsTracking(false)
    }
  }, [deviceFingerprint, config, trustLevel])

  return { isTracking, trustLevel }
}
