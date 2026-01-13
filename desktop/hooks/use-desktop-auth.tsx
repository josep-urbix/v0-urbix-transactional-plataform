"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  avatar_url?: string
  email_verified: boolean
  two_factor_enabled: boolean
  kyc_status: string
  kyc_level: number
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string, twoFactorCode?: string) => Promise<boolean>
  loginWithMagicLink: (email: string) => Promise<boolean>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | null>(null)

const API_BASE = "https://integrations.urbix.es"

export function DesktopAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check session on mount
  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    const token = localStorage.getItem("access_token")
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/investors/auth/session`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        if (data.authenticated) {
          setUser(data.user)
        } else {
          // Try refresh token
          const refreshed = await refreshToken()
          if (!refreshed) {
            clearTokens()
          }
        }
      } else {
        clearTokens()
      }
    } catch (err) {
      console.error("Error checking session:", err)
      clearTokens()
    } finally {
      setLoading(false)
    }
  }

  function clearTokens() {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setUser(null)
  }

  function saveTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem("access_token", accessToken)
    localStorage.setItem("refresh_token", refreshToken)
  }

  async function login(email: string, password: string, twoFactorCode?: string): Promise<boolean> {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/investors/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          two_factor_code: twoFactorCode,
          device_fingerprint: getDeviceFingerprint(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error de autenticación")
        return false
      }

      if (data.requires_2fa) {
        setError("Se requiere código 2FA")
        return false
      }

      saveTokens(data.access_token, data.refresh_token)
      setUser(data.user)
      router.push("/desktop/dashboard")
      return true
    } catch (err) {
      setError("Error de conexión")
      return false
    } finally {
      setLoading(false)
    }
  }

  async function loginWithMagicLink(email: string): Promise<boolean> {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/investors/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error enviando magic link")
        return false
      }

      return true
    } catch (err) {
      setError("Error de conexión")
      return false
    } finally {
      setLoading(false)
    }
  }

  async function loginWithGoogle(): Promise<void> {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/investors/auth/google`)
      const data = await res.json()

      if (data.auth_url) {
        // Store state for callback verification
        localStorage.setItem("oauth_state", data.state)
        window.location.href = data.auth_url
      }
    } catch (err) {
      setError("Error iniciando Google OAuth")
    } finally {
      setLoading(false)
    }
  }

  async function logout(): Promise<void> {
    const token = localStorage.getItem("access_token")
    if (token) {
      try {
        await fetch(`${API_BASE}/api/investors/auth/session`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (err) {
        console.error("Error during logout:", err)
      }
    }

    clearTokens()
    router.push("/desktop/login")
  }

  async function refreshToken(): Promise<boolean> {
    const refreshTokenValue = localStorage.getItem("refresh_token")
    if (!refreshTokenValue) return false

    try {
      const res = await fetch(`${API_BASE}/api/investors/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem("access_token", data.access_token)
        return true
      }

      return false
    } catch (err) {
      return false
    }
  }

  function getDeviceFingerprint(): string {
    // Simple fingerprint based on browser info
    const nav = window.navigator
    const screen = window.screen
    const fp = [
      nav.userAgent,
      nav.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
    ].join("|")

    // Simple hash
    let hash = 0
    for (let i = 0; i < fp.length; i++) {
      const char = fp.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        loginWithMagicLink,
        loginWithGoogle,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useDesktopAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useDesktopAuth must be used within DesktopAuthProvider")
  }
  return context
}
