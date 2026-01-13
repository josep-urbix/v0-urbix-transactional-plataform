"use client"

import { useEffect, useRef } from "react"

export function RetryQueueMonitor() {
  const isProcessingRef = useRef(false)

  useEffect(() => {
    const processQueue = async () => {
      if (isProcessingRef.current) {
        return
      }

      try {
        isProcessingRef.current = true

        const response = await fetch("/api/lemonway/retry-queue", {
          method: "POST",
        })

        if (!response.ok) {
          console.warn(`[RetryQueueMonitor] Server returned ${response.status}`)
          return
        }

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          console.warn("[RetryQueueMonitor] Non-JSON response received")
          return
        }

        await response.json()
      } catch (error) {
        // Silent fail - don't spam console
      } finally {
        isProcessingRef.current = false
      }
    }

    processQueue()

    const interval = setInterval(processQueue, 30 * 1000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  return null
}
