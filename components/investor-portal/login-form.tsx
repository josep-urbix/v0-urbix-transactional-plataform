"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Lock, Loader2, KeyRound } from "lucide-react"
import { useInvestorAuth } from "@/hooks/use-investor-auth"

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        fill="currentColor"
      />
    </svg>
  )
}

export function InvestorLoginForm() {
  const { login, loginWithGoogle, loading, error, clearError } = useInvestorAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [requires2FA, setRequires2FA] = useState(false)
  const [authConfig, setAuthConfig] = useState({
    googleOAuthEnabled: true,
    magicLinkEnabled: true,
    passwordLoginEnabled: true,
  })

  useEffect(() => {
    async function fetchAuthConfig() {
      try {
        const response = await fetch("/api/investors/auth/config")
        if (response.ok) {
          const config = await response.json()
          setAuthConfig(config)
        }
      } catch (error) {
        console.error("Error fetching auth config:", error)
      }
    }
    fetchAuthConfig()
  }, [])

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    const success = await login(email, password, requires2FA ? twoFactorCode : undefined)
    if (!success && error === "REQUIRES_2FA") {
      setRequires2FA(true)
      clearError()
    }
  }

  async function handleGoogleLogin() {
    await loginWithGoogle()
  }

  if (requires2FA) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-xl border-0 rounded-xl overflow-hidden">
        <div className="h-2 bg-[#164AA6]" />
        <CardHeader className="text-center pt-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/images/captura-20de-20pantalla-202026-01-04-20a-20les-2017.png"
              alt="URBIX"
              width={64}
              height={64}
              className="h-16 w-16"
              priority
            />
          </div>
          <div className="mx-auto w-16 h-16 bg-[#164AA6]/10 rounded-full flex items-center justify-center mb-4">
            <KeyRound className="h-8 w-8 text-[#164AA6]" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#164AA6]">Verificación 2FA</CardTitle>
          <CardDescription className="text-base text-[#777777]">
            Introduce el código de tu aplicación de autenticación
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8">
          {error && error !== "REQUIRES_2FA" && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm text-center border border-red-200">
              {error}
            </div>
          )}
          <form onSubmit={handlePasswordLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="2fa-code" className="text-[#777777] font-medium">
                Código 2FA
              </Label>
              <Input
                id="2fa-code"
                type="text"
                placeholder="000000"
                className="text-center text-2xl tracking-[0.5em] h-14 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6]"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-[#164AA6] hover:bg-[#123d8a] text-white font-medium text-base rounded-lg transition-all"
              disabled={loading || twoFactorCode.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="px-8 pb-8">
          <Button
            variant="ghost"
            className="w-full text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]"
            onClick={() => {
              setRequires2FA(false)
              clearError()
            }}
          >
            Volver al inicio
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-0 rounded-xl overflow-hidden">
      <div className="h-2 bg-[#164AA6]" />
      <CardHeader className="text-center pt-8 pb-4">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/captura-20de-20pantalla-202026-01-04-20a-20les-2017.png"
            alt="URBIX"
            width={80}
            height={80}
            className="h-20 w-20"
            priority
          />
        </div>
        <CardTitle className="text-2xl font-bold text-[#164AA6]">Portal de Inversores</CardTitle>
        <CardDescription className="text-[#777777]">Accede a tu cuenta para gestionar tus inversiones</CardDescription>
      </CardHeader>
      <CardContent className="px-8 pt-2">
        {error && error !== "REQUIRES_2FA" && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        {authConfig.passwordLoginEnabled && (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#777777] font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#777777]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="pl-12 h-12 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6] rounded-lg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#777777] font-medium">
                  Contraseña
                </Label>
                <a
                  href="/investor-portal/forgot-password"
                  className="text-sm text-[#0FB7EA] hover:text-[#164AA6] hover:underline transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#777777]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-12 h-12 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6] rounded-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-[#164AA6] hover:bg-[#123d8a] text-white font-medium text-base rounded-lg transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Accediendo...
                </>
              ) : (
                "Acceder"
              )}
            </Button>
          </form>
        )}

        {authConfig.passwordLoginEnabled && (authConfig.googleOAuthEnabled || authConfig.magicLinkEnabled) && (
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#E6E6E6]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-4 text-[#777777]">O continuar con</span>
            </div>
          </div>
        )}

        {(authConfig.googleOAuthEnabled || authConfig.magicLinkEnabled) && (
          <div className="grid grid-cols-2 gap-4">
            {authConfig.googleOAuthEnabled && (
              <Button
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="h-12 font-medium bg-white border-[#E6E6E6] hover:bg-[#F2F2F2] hover:border-[#164AA6] rounded-lg transition-all"
              >
                <GoogleLogo className="mr-2 h-5 w-5" />
                Google
              </Button>
            )}
            <Button
              variant="outline"
              disabled
              title="Próximamente"
              className="h-12 font-medium bg-white border-[#E6E6E6] hover:bg-[#F2F2F2] rounded-lg transition-all"
            >
              <AppleLogo className="mr-2 h-5 w-5" />
              Apple
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center text-sm text-[#777777] border-t border-[#E6E6E6] pt-6 pb-8 mx-8">
        <p>
          ¿No tienes cuenta?{" "}
          <a
            href="/investor-portal/register"
            className="text-[#164AA6] hover:text-[#0FB7EA] hover:underline font-semibold transition-colors"
          >
            Regístrate
          </a>
        </p>
      </CardFooter>
    </Card>
  )
}
