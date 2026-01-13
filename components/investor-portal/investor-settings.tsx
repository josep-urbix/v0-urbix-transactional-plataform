"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useInvestorAuth } from "@/hooks/use-investor-auth"
import {
  User,
  Shield,
  Bell,
  Lock,
  ChevronLeft,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  QrCode,
  Copy,
  CheckCircle2,
  Bug,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface InvestorUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  avatar_url?: string
  phone?: string
  two_factor_enabled?: boolean
  two_factor_method?: string
  google_id?: string
  apple_id?: string
  has_password?: boolean
}

interface InvestorSettingsProps {
  user: InvestorUser
  defaultTab?: "profile" | "security" | "password" | "notifications"
}

export function InvestorSettings({ user, defaultTab = "profile" }: InvestorSettingsProps) {
  const { logout, paymentAccount, paymentAccountLoading, refreshPaymentAccount } = useInvestorAuth() // Added paymentAccount, paymentAccountLoading, refreshPaymentAccount
  const [activeTab, setActiveTab] = useState(defaultTab)

  const isDebugUser = user.email === "flaixet@gmail.com"
  const [debugMode, setDebugMode] = useState(false)
  const [debugData, setDebugData] = useState<Record<string, unknown>>({})

  // Profile state
  const [firstName, setFirstName] = useState(user.first_name || "")
  const [lastName, setLastName] = useState(user.last_name || "")
  const [phone, setPhone] = useState(user.phone || "")
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [switchingToPassword, setSwitchingToPassword] = useState(false)
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const [switchNewPassword, setSwitchNewPassword] = useState("")
  const [switchConfirmPassword, setSwitchConfirmPassword] = useState("")
  const [showSwitchPassword, setShowSwitchPassword] = useState(false)

  const isOAuthUser = (user.google_id || user.apple_id) && !user.has_password
  const oauthProvider = user.google_id ? "Google" : user.apple_id ? "Apple" : null

  // Notifications state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [investmentUpdates, setInvestmentUpdates] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user.two_factor_enabled || false)
  const [twoFactorMethod, setTwoFactorMethod] = useState<string | null>(null)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [selected2FAMethod, setSelected2FAMethod] = useState<"totp" | "sms" | "email">("totp")
  const [setupStep, setSetupStep] = useState<"select" | "configure" | "verify">("select")
  const [totpSecret, setTotpSecret] = useState("")
  const [totpQrCode, setTotpQrCode] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [verifying2FA, setVerifying2FA] = useState(false)
  const [setup2FAError, setSetup2FAError] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState(false)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (debugMode && isDebugUser) {
      const fetchDebugData = async () => {
        const token = localStorage.getItem("investor_access_token")

        // Collect all API responses
        const data: Record<string, unknown> = {
          timestamp: new Date().toISOString(),
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            display_name: user.display_name,
            phone: user.phone,
            google_id: user.google_id,
            apple_id: user.apple_id,
            has_password: user.has_password,
            two_factor_enabled: user.two_factor_enabled,
            two_factor_method: user.two_factor_method,
          },
          paymentAccount: paymentAccount,
          paymentAccountLoading: paymentAccountLoading,
          localStorage: {
            investor_access_token: token ? `${token.substring(0, 20)}...` : null,
            investor_refresh_token: localStorage.getItem("investor_refresh_token") ? "present" : null,
            investor_payment_account: localStorage.getItem("investor_payment_account"),
          },
        }

        // Fetch session info
        try {
          const sessionRes = await fetch("/api/investors/auth/session", {
            headers: { Authorization: `Bearer ${token}` },
          })
          data.sessionResponse = {
            status: sessionRes.status,
            data: await sessionRes.json(),
          }
        } catch (e) {
          data.sessionResponse = { error: String(e) }
        }

        // Fetch 2FA status
        try {
          const twoFaRes = await fetch("/api/investors/2fa/status", {
            headers: { Authorization: `Bearer ${token}` },
          })
          data.twoFaStatus = {
            status: twoFaRes.status,
            data: await twoFaRes.json(),
          }
        } catch (e) {
          data.twoFaStatus = { error: String(e) }
        }

        try {
          const paymentUrl = `/api/investors/payment-account?email=${encodeURIComponent(user.email)}`
          data.paymentAccountRequest = {
            url: paymentUrl,
            method: "GET",
            headers: { Authorization: "Bearer [token]" },
          }
          const paymentRes = await fetch(paymentUrl, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const paymentData = await paymentRes.json()
          data.paymentAccountResponse = {
            status: paymentRes.status,
            statusText: paymentRes.statusText,
            headers: {
              contentType: paymentRes.headers.get("content-type"),
            },
            data: paymentData,
            _debug: paymentData._debug || null,
          }
        } catch (e) {
          data.paymentAccountResponse = { error: String(e) }
        }

        setDebugData(data)
      }

      fetchDebugData()
    }
  }, [debugMode, isDebugUser, user, paymentAccount, paymentAccountLoading])

  useEffect(() => {
    const load2FAStatus = async () => {
      try {
        const token = localStorage.getItem("investor_access_token")
        const response = await fetch("/api/investors/2fa/status", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          const data = await response.json()
          setTwoFactorEnabled(data.enabled)
          setTwoFactorMethod(data.method)
        }
      } catch {
        // Silent fail
      }
    }
    load2FAStatus()
  }, [])

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    setProfileMessage(null)

    try {
      const token = localStorage.getItem("investor_access_token")
      const response = await fetch("/api/investors/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
        }),
      })

      if (response.ok) {
        setProfileMessage({ type: "success", text: "Perfil actualizado correctamente" })
      } else {
        const data = await response.json()
        setProfileMessage({ type: "error", text: data.error || "Error al actualizar perfil" })
      }
    } catch {
      setProfileMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Las contraseñas no coinciden" })
      return
    }

    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "La contraseña debe tener al menos 8 caracteres" })
      return
    }

    setSavingPassword(true)
    setPasswordMessage(null)

    try {
      const token = localStorage.getItem("investor_access_token")
      const response = await fetch("/api/investors/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      })

      if (response.ok) {
        setPasswordMessage({ type: "success", text: "Contraseña actualizada correctamente" })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        const data = await response.json()
        setPasswordMessage({ type: "error", text: data.error || "Error al cambiar contraseña" })
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSwitchToPassword = async () => {
    if (switchNewPassword !== switchConfirmPassword) {
      setPasswordMessage({ type: "error", text: "Las contraseñas no coinciden" })
      return
    }

    if (switchNewPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "La contraseña debe tener al menos 8 caracteres" })
      return
    }

    setSwitchingToPassword(true)
    setPasswordMessage(null)

    try {
      const token = localStorage.getItem("investor_access_token")
      const response = await fetch("/api/investors/auth/switch-to-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          new_password: switchNewPassword,
          unlink_provider: oauthProvider?.toLowerCase(),
        }),
      })

      if (response.ok) {
        setPasswordMessage({
          type: "success",
          text: `Has dejado de usar ${oauthProvider} y ahora puedes iniciar sesión con tu email y contraseña`,
        })
        setShowSwitchDialog(false)
        setSwitchNewPassword("")
        setSwitchConfirmPassword("")
        // Reload to update user data
        window.location.reload()
      } else {
        const data = await response.json()
        setPasswordMessage({ type: "error", text: data.error || "Error al cambiar método de autenticación" })
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Error de conexión" })
    } finally {
      setSwitchingToPassword(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSavingNotifications(true)

    try {
      const token = localStorage.getItem("investor_access_token")
      await fetch("/api/investors/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email_notifications: emailNotifications,
          investment_updates: investmentUpdates,
          marketing_emails: marketingEmails,
        }),
      })
    } catch {
      // Silent fail
    } finally {
      setSavingNotifications(false)
    }
  }

  const handleStart2FASetup = () => {
    setShow2FASetup(true)
    setSetupStep("select")
    setSelected2FAMethod("totp")
    setVerificationCode("")
    setSetup2FAError(null)
  }

  const handleConfigure2FA = async () => {
    setSetup2FAError(null)

    try {
      const token = localStorage.getItem("investor_access_token")
      const response = await fetch("/api/investors/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ method: selected2FAMethod }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSetup2FAError(data.error || "Error al configurar 2FA")
        return
      }

      if (selected2FAMethod === "totp") {
        setTotpSecret(data.secret)
        setTotpQrCode(data.qr_code)
      }

      setSetupStep("verify")
    } catch {
      setSetup2FAError("Error de conexión")
    }
  }

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) {
      setSetup2FAError("El código debe tener 6 dígitos")
      return
    }

    setVerifying2FA(true)
    setSetup2FAError(null)

    try {
      const token = localStorage.getItem("investor_access_token")
      const response = await fetch("/api/investors/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: selected2FAMethod,
          code: verificationCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSetup2FAError(data.error || "Código inválido")
        return
      }

      setTwoFactorEnabled(true)
      setTwoFactorMethod(selected2FAMethod)
      setShow2FASetup(false)
      setVerificationCode("")
    } catch {
      setSetup2FAError("Error de conexión")
    } finally {
      setVerifying2FA(false)
    }
  }

  const handleDisable2FA = async () => {
    try {
      const token = localStorage.getItem("investor_access_token")
      const response = await fetch("/api/investors/2fa", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setTwoFactorEnabled(false)
        setTwoFactorMethod(null)
      }
    } catch {
      // Silent fail
    }
  }

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "ELIMINAR") {
      setDeleteError("Escribe ELIMINAR para confirmar")
      return
    }

    setDeletingAccount(true)
    setDeleteError(null)

    try {
      const token = localStorage.getItem("investor_access_token")
      const response = await fetch("/api/investors/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        logout()
      } else {
        const data = await response.json()
        setDeleteError(data.error || "Error al eliminar cuenta")
      }
    } catch {
      setDeleteError("Error de conexión")
    } finally {
      setDeletingAccount(false)
    }
  }

  const getInitials = () => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    return user.email[0].toUpperCase()
  }

  const get2FAMethodLabel = (method: string | null) => {
    switch (method) {
      case "totp":
        return "Google Authenticator"
      case "sms":
        return "SMS"
      case "email":
        return "Email"
      default:
        return "No configurado"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/investor-portal/dashboard">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Configuración</h1>
              <p className="text-sm text-gray-500">Gestiona tu cuenta y preferencias</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full mb-8">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Contraseña</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificaciones</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Información del perfil</CardTitle>
                <CardDescription>Actualiza tu información personal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback className="bg-[#0066CC] text-white text-xl">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.display_name || user.email}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                {/* Form */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellidos</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Tus apellidos"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user.email} disabled className="bg-gray-50" />
                  <p className="text-xs text-gray-500">El email no se puede cambiar</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                  />
                </div>

                {profileMessage && (
                  <div
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      profileMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {profileMessage.type === "success" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {profileMessage.text}
                  </div>
                )}

                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-[#0066CC] hover:bg-[#0055AA]"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Seguridad de la cuenta</CardTitle>
                <CardDescription>Gestiona las opciones de seguridad de tu cuenta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 2FA Section */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Autenticación de dos factores (2FA)</p>
                      <p className="text-sm text-gray-500">
                        {twoFactorEnabled
                          ? `Activado mediante ${get2FAMethodLabel(twoFactorMethod)}`
                          : "Añade una capa extra de seguridad a tu cuenta"}
                      </p>
                    </div>
                    {twoFactorEnabled ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Activado
                        </span>
                        <Button variant="outline" size="sm" onClick={handleDisable2FA}>
                          Desactivar
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={handleStart2FASetup} className="bg-[#0066CC] hover:bg-[#0055AA]">
                        Configurar 2FA
                      </Button>
                    )}
                  </div>

                  {twoFactorEnabled && (
                    <div className="pt-2 border-t">
                      <Button variant="link" className="p-0 h-auto text-[#0066CC]" onClick={handleStart2FASetup}>
                        Cambiar método de verificación
                      </Button>
                    </div>
                  )}
                </div>

                {/* Sessions */}
                <div className="p-4 border rounded-lg space-y-2">
                  <p className="font-medium">Sesiones activas</p>
                  <p className="text-sm text-gray-500">Dispositivo actual</p>
                  <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                    Cerrar todas las otras sesiones
                  </Button>
                </div>

                {/* Delete Account - Soft Delete */}
                <div className="p-4 border rounded-lg border-red-200 bg-red-50 space-y-2">
                  <p className="font-medium text-red-700">Zona de peligro</p>
                  <p className="text-sm text-red-600">
                    Al eliminar tu cuenta, se desactivará y tus datos serán anonimizados. Esta acción se puede revertir
                    contactando con soporte en los próximos 30 días.
                  </p>
                  <Button variant="destructive" size="sm" className="mt-2" onClick={() => setShowDeleteDialog(true)}>
                    Eliminar cuenta
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Cambiar contraseña</CardTitle>
                <CardDescription>
                  {isOAuthUser
                    ? `Actualmente inicias sesión con ${oauthProvider}`
                    : "Actualiza tu contraseña de acceso"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isOAuthUser ? (
                  <>
                    {/* OAuth user - show disabled fields and switch button */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          {oauthProvider === "Google" ? (
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                              <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              />
                            </svg>
                          ) : (
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="black">
                              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">Vinculado con {oauthProvider}</p>
                          <p className="text-sm text-blue-700 mt-1">
                            Tu cuenta está vinculada con {oauthProvider}. No necesitas contraseña para iniciar sesión.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 opacity-50">
                      <Label htmlFor="currentPassword">Contraseña actual</Label>
                      <Input id="currentPassword" type="password" placeholder="••••••••" disabled />
                    </div>

                    <div className="space-y-2 opacity-50">
                      <Label htmlFor="newPassword">Nueva contraseña</Label>
                      <Input id="newPassword" type="password" placeholder="••••••••" disabled />
                      <p className="text-xs text-gray-500">Mínimo 8 caracteres</p>
                    </div>

                    <div className="space-y-2 opacity-50">
                      <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                      <Input id="confirmPassword" type="password" placeholder="••••••••" disabled />
                    </div>

                    {passwordMessage && (
                      <div
                        className={`flex items-center gap-2 p-3 rounded-lg ${
                          passwordMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {passwordMessage.type === "success" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        {passwordMessage.text}
                      </div>
                    )}

                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-medium mb-2">¿Prefieres usar contraseña?</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        Puedes dejar de usar {oauthProvider} y configurar una contraseña para iniciar sesión con tu
                        email.
                      </p>

                      {!showSwitchDialog ? (
                        <Button
                          variant="outline"
                          onClick={() => setShowSwitchDialog(true)}
                          className="border-[#0066CC] text-[#0066CC] hover:bg-[#0066CC]/10"
                        >
                          Dejar de usar {oauthProvider} y usar contraseña
                        </Button>
                      ) : (
                        <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                          <div className="space-y-2">
                            <Label htmlFor="switchNewPassword">Nueva contraseña</Label>
                            <div className="relative">
                              <Input
                                id="switchNewPassword"
                                type={showSwitchPassword ? "text" : "password"}
                                value={switchNewPassword}
                                onChange={(e) => setSwitchNewPassword(e.target.value)}
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() => setShowSwitchPassword(!showSwitchPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                              >
                                {showSwitchPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500">Mínimo 8 caracteres</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="switchConfirmPassword">Confirmar contraseña</Label>
                            <Input
                              id="switchConfirmPassword"
                              type="password"
                              value={switchConfirmPassword}
                              onChange={(e) => setSwitchConfirmPassword(e.target.value)}
                              placeholder="••••••••"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={handleSwitchToPassword}
                              disabled={switchingToPassword || !switchNewPassword || !switchConfirmPassword}
                              className="bg-[#0066CC] hover:bg-[#0055AA]"
                            >
                              {switchingToPassword ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Cambiando...
                                </>
                              ) : (
                                "Confirmar cambio"
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setShowSwitchDialog(false)
                                setSwitchNewPassword("")
                                setSwitchConfirmPassword("")
                              }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Normal password user - show regular password change form */}
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Contraseña actual</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nueva contraseña</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">Mínimo 8 caracteres</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>

                    {passwordMessage && (
                      <div
                        className={`flex items-center gap-2 p-3 rounded-lg ${
                          passwordMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        {passwordMessage.type === "success" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        {passwordMessage.text}
                      </div>
                    )}

                    <Button
                      onClick={handleChangePassword}
                      disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                      className="bg-[#0066CC] hover:bg-[#0055AA]"
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        "Cambiar contraseña"
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Preferencias de notificaciones</CardTitle>
                <CardDescription>Configura cómo quieres recibir las notificaciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Notificaciones por email</p>
                    <p className="text-sm text-gray-500">Recibe notificaciones importantes por email</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={(checked) => {
                      setEmailNotifications(checked)
                      handleSaveNotifications()
                    }}
                    disabled={savingNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Actualizaciones de inversiones</p>
                    <p className="text-sm text-gray-500">Recibe alertas sobre tus inversiones activas</p>
                  </div>
                  <Switch
                    checked={investmentUpdates}
                    onCheckedChange={(checked) => {
                      setInvestmentUpdates(checked)
                      handleSaveNotifications()
                    }}
                    disabled={savingNotifications}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Emails de marketing</p>
                    <p className="text-sm text-gray-500">Recibe información sobre nuevas oportunidades</p>
                  </div>
                  <Switch
                    checked={marketingEmails}
                    onCheckedChange={(checked) => {
                      setMarketingEmails(checked)
                      handleSaveNotifications()
                    }}
                    disabled={savingNotifications}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {isDebugUser && (
          <div className="mt-8">
            <Card className="border-dashed border-2 border-orange-300 bg-orange-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bug className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-orange-800">Debug Mode</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="debugMode" className="text-sm text-orange-700">
                      {debugMode ? "Activado" : "Desactivado"}
                    </Label>
                    <Switch
                      id="debugMode"
                      checked={debugMode}
                      onCheckedChange={setDebugMode}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  </div>
                </div>
                <CardDescription className="text-orange-600">
                  Solo visible para flaixet@gmail.com - Muestra datos de las APIs del middleware
                </CardDescription>
              </CardHeader>

              {debugMode && (
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refreshPaymentAccount()}
                        className="border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        Refrescar Payment Account
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDebugData({})}
                        className="border-orange-300 text-orange-700 hover:bg-orange-100"
                      >
                        Limpiar
                      </Button>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[600px]">
                      <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                        {JSON.stringify(debugData, null, 2)}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </main>

      <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {setupStep === "select" && "Configurar autenticación de dos factores"}
              {setupStep === "configure" && "Configurando 2FA"}
              {setupStep === "verify" && "Verificar código"}
            </DialogTitle>
            <DialogDescription>
              {setupStep === "select" && "Elige el método de verificación que prefieras"}
              {setupStep === "verify" &&
                selected2FAMethod === "totp" &&
                "Escanea el código QR con Google Authenticator"}
              {setupStep === "verify" && selected2FAMethod === "sms" && "Te hemos enviado un código SMS a tu teléfono"}
              {setupStep === "verify" && selected2FAMethod === "email" && "Te hemos enviado un código a tu email"}
            </DialogDescription>
          </DialogHeader>

          {setupStep === "select" && (
            <div className="space-y-4 py-4">
              <RadioGroup
                value={selected2FAMethod}
                onValueChange={(v) => setSelected2FAMethod(v as "totp" | "sms" | "email")}
              >
                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="totp" id="totp" />
                  <Label htmlFor="totp" className="flex items-center gap-3 cursor-pointer flex-1">
                    <QrCode className="h-5 w-5 text-[#0066CC]" />
                    <div>
                      <p className="font-medium">Google Authenticator</p>
                      <p className="text-sm text-gray-500">Usa una app de autenticación</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="sms" id="sms" />
                  <Label htmlFor="sms" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Smartphone className="h-5 w-5 text-[#0066CC]" />
                    <div>
                      <p className="font-medium">SMS</p>
                      <p className="text-sm text-gray-500">Recibe un código en tu móvil</p>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email" className="flex items-center gap-3 cursor-pointer flex-1">
                    <Mail className="h-5 w-5 text-[#0066CC]" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-gray-500">Recibe un código y enlace por email</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {setup2FAError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {setup2FAError}
                </div>
              )}
            </div>
          )}

          {setupStep === "verify" && selected2FAMethod === "totp" && (
            <div className="space-y-4 py-4">
              {totpQrCode && (
                <div className="flex justify-center">
                  <div className="p-4 bg-white border rounded-lg">
                    <Image
                      src={totpQrCode || "/placeholder.svg"}
                      alt="QR Code"
                      width={200}
                      height={200}
                      className="mx-auto"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm text-gray-500">O introduce este código manualmente:</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">{totpSecret}</code>
                  <Button variant="outline" size="icon" onClick={handleCopySecret}>
                    {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Código de verificación</Label>
                <Input
                  id="code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              {setup2FAError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {setup2FAError}
                </div>
              )}
            </div>
          )}

          {setupStep === "verify" && (selected2FAMethod === "sms" || selected2FAMethod === "email") && (
            <div className="space-y-4 py-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                {selected2FAMethod === "sms" ? (
                  <Smartphone className="h-12 w-12 mx-auto text-[#0066CC] mb-2" />
                ) : (
                  <Mail className="h-12 w-12 mx-auto text-[#0066CC] mb-2" />
                )}
                <p className="text-sm text-gray-600">
                  {selected2FAMethod === "sms"
                    ? `Hemos enviado un código a tu teléfono ${user.phone || ""}`
                    : `Hemos enviado un código a ${user.email}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Código de verificación</Label>
                <Input
                  id="code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              {selected2FAMethod === "email" && (
                <p className="text-sm text-gray-500 text-center">
                  También puedes hacer clic en el enlace del email para verificar
                </p>
              )}

              {setup2FAError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  {setup2FAError}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {setupStep === "select" && (
              <>
                <Button variant="outline" onClick={() => setShow2FASetup(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfigure2FA} className="bg-[#0066CC] hover:bg-[#0055AA]">
                  Continuar
                </Button>
              </>
            )}
            {setupStep === "verify" && (
              <>
                <Button variant="outline" onClick={() => setSetupStep("select")}>
                  Volver
                </Button>
                <Button
                  onClick={handleVerify2FA}
                  disabled={verifying2FA || verificationCode.length !== 6}
                  className="bg-[#0066CC] hover:bg-[#0055AA]"
                >
                  {verifying2FA ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Verificar y activar"
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar cuenta</DialogTitle>
            <DialogDescription>
              Esta acción desactivará tu cuenta y anonimizará tus datos personales. Podrás recuperar tu cuenta
              contactando con soporte dentro de los próximos 30 días.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Qué ocurrirá:</strong>
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>Tu cuenta será marcada como eliminada</li>
                <li>No podrás acceder hasta contactar con soporte</li>
                <li>Tus datos personales serán anonimizados</li>
                <li>Después de 30 días, la eliminación será permanente</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Escribe ELIMINAR para confirmar</Label>
              <Input
                id="confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                placeholder="ELIMINAR"
              />
            </div>

            {deleteError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700">
                <AlertCircle className="h-4 w-4" />
                {deleteError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteConfirmText !== "ELIMINAR"}
            >
              {deletingAccount ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar cuenta"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
