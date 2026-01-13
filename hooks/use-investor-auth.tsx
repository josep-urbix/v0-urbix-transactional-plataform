"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface InvestorUser {
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
  google_id?: string
  apple_id?: string
  has_password?: boolean
}

interface PaymentAccount {
  id: number
  accountId: string
  email: string
  status: string
  balance: number
  isBlocked: boolean
  firstName?: string
  lastName?: string
  kycStatus?: string
  accountType?: string
  currency: string
  createdAt?: string
  lastSyncAt?: string
}

interface InvestorAuthContextType {
  user: InvestorUser | null
  paymentAccount: PaymentAccount | null
  paymentAccountLoading: boolean
  loading: boolean
  error: string | null
  login: (email: string, password: string, twoFactorCode?: string) => Promise<boolean>
  loginWithMagicLink: (email: string) => Promise<boolean>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<boolean>
  refreshPaymentAccount: () => Promise<void>
  clearError: () => void
  setAuthenticatedUser: (userData: InvestorUser, accessToken: string, refreshTokenValue: string) => void
  initialized: boolean
}

const InvestorAuthContext = createContext<InvestorAuthContextType | null>(null)

export function InvestorAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<InvestorUser | null>(null)
  const [paymentAccount, setPaymentAccount] = useState<PaymentAccount | null>(null)
  const [paymentAccountLoading, setPaymentAccountLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      checkSession()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  async function fetchPaymentAccount(email: string, token: string) {
    setPaymentAccountLoading(true)
    try {
      console.log("[v0] Fetching payment account for:", email)
      const res = await fetch(`/api/investors/payment-account?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await res.json()
      console.log("[v0] Payment account response:", data)

      if (data.exists && data.account) {
        setPaymentAccount(data.account)
        localStorage.setItem("investor_payment_account", JSON.stringify(data.account))
      } else {
        setPaymentAccount(null)
        localStorage.removeItem("investor_payment_account")
      }
    } catch (err) {
      console.error("[v0] Error fetching payment account:", err)
    } finally {
      setPaymentAccountLoading(false)
    }
  }

  async function checkSession() {
    const pendingAuth = sessionStorage.getItem("investor_auth_pending")
    if (pendingAuth) {
      console.log("[v0] Auth pending, waiting for callback completion...")
      setLoading(false)
      setInitialized(true)
      return
    }

    const token = localStorage.getItem("investor_access_token")
    console.log("[v0] checkSession - token exists:", !!token)

    if (!token) {
      setLoading(false)
      setInitialized(true)
      return
    }

    const cachedPaymentAccount = localStorage.getItem("investor_payment_account")
    if (cachedPaymentAccount) {
      try {
        setPaymentAccount(JSON.parse(cachedPaymentAccount))
      } catch {}
    }

    try {
      const res = await fetch(`/api/investors/auth/session`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log("[v0] checkSession - response status:", res.status)

      if (res.ok) {
        const data = await res.json()
        console.log("[v0] checkSession - authenticated:", data.authenticated)
        if (data.authenticated) {
          setUser(data.user)
          if (data.user?.email) {
            fetchPaymentAccount(data.user.email, token)
          }
        } else {
          const refreshed = await refreshToken()
          if (!refreshed) {
            clearTokens()
          }
        }
      } else {
        clearTokens()
      }
    } catch (err) {
      console.error("[v0] Error checking session:", err)
      clearTokens()
    } finally {
      setLoading(false)
      setInitialized(true)
    }
  }

  function clearTokens() {
    localStorage.removeItem("investor_access_token")
    localStorage.removeItem("investor_refresh_token")
    localStorage.removeItem("investor_payment_account")
    setUser(null)
    setPaymentAccount(null)
  }

  function saveTokens(accessToken: string, refreshToken: string) {
    localStorage.setItem("investor_access_token", accessToken)
    localStorage.setItem("investor_refresh_token", refreshToken)
  }

  function clearError() {
    setError(null)
  }

  async function login(email: string, password: string, twoFactorCode?: string): Promise<boolean> {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/investors/auth/login`, {
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
        setError("REQUIRES_2FA")
        return false
      }

      saveTokens(data.access_token, data.refresh_token)
      setUser(data.user)

      if (data.user?.email) {
        await fetchPaymentAccount(data.user.email, data.access_token)
      }

      router.push("/investor-portal/dashboard")
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
      const res = await fetch(`/api/investors/auth/magic-link`, {
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
      console.log("[v0] loginWithGoogle - fetching /api/investors/auth/google")
      sessionStorage.setItem("investor_auth_pending", "google")

      const deviceFingerprint = getDeviceFingerprint()
      console.log("[v0] loginWithGoogle - device fingerprint:", deviceFingerprint)

      const res = await fetch(`/api/investors/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_fingerprint: deviceFingerprint }),
      })
      const data = await res.json()
      console.log("[v0] loginWithGoogle - response:", data)

      if (data.auth_url && data.state) {
        console.log("[v0] loginWithGoogle - saving state to localStorage:", data.state)
        localStorage.setItem("investor_oauth_state", data.state)
        localStorage.setItem("investor_oauth_device_fingerprint", deviceFingerprint)
        console.log("[v0] loginWithGoogle - redirecting to:", data.auth_url)
        window.location.href = data.auth_url
      } else {
        console.log("[v0] loginWithGoogle - missing auth_url or state")
        sessionStorage.removeItem("investor_auth_pending")
        setError(data.error || "Error iniciando Google OAuth")
        setLoading(false)
      }
    } catch (err) {
      console.log("[v0] loginWithGoogle - error:", err)
      sessionStorage.removeItem("investor_auth_pending")
      setError("Error iniciando Google OAuth")
      setLoading(false)
    }
  }

  async function logout(): Promise<void> {
    const token = localStorage.getItem("investor_access_token")
    if (token) {
      try {
        await fetch(`/api/investors/auth/session`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (err) {
        console.error("Error during logout:", err)
      }
    }

    clearTokens()
    router.push("/investor-portal/login")
  }

  async function refreshToken(): Promise<boolean> {
    const refreshTokenValue = localStorage.getItem("investor_refresh_token")
    if (!refreshTokenValue) return false

    try {
      const res = await fetch(`/api/investors/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem("investor_access_token", data.access_token)
        return true
      }

      return false
    } catch (err) {
      return false
    }
  }

  async function refreshPaymentAccount() {
    const token = localStorage.getItem("investor_access_token")
    if (token && user?.email) {
      await fetchPaymentAccount(user.email, token)
    }
  }

  function getDeviceFingerprint(): string {
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

    let hash = 0
    for (let i = 0; i < fp.length; i++) {
      const char = fp.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  function setAuthenticatedUser(userData: InvestorUser, accessToken: string, refreshTokenValue: string) {
    console.log("[v0] setAuthenticatedUser - setting user:", userData.email)
    localStorage.setItem("investor_access_token", accessToken)
    localStorage.setItem("investor_refresh_token", refreshTokenValue)
    sessionStorage.removeItem("investor_auth_pending")
    setUser(userData)
    setLoading(false)

    if (userData.email) {
      fetchPaymentAccount(userData.email, accessToken)
    }
  }

  return (
    <InvestorAuthContext.Provider
      value={{
        user,
        paymentAccount,
        paymentAccountLoading,
        loading,
        error,
        login,
        loginWithMagicLink,
        loginWithGoogle,
        logout,
        refreshToken,
        refreshPaymentAccount,
        clearError,
        setAuthenticatedUser,
        initialized,
      }}
    >
      {children}
    </InvestorAuthContext.Provider>
  )
}

export function useInvestorAuth() {
  const context = useContext(InvestorAuthContext)
  if (!context) {
    throw new Error("useInvestorAuth must be used within InvestorAuthProvider")
  }
  return context
}
