"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Mail, Lock, User, Phone, Loader2, ArrowRight, CheckCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function InvestorRegisterForm() {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
    acceptPrivacy: false,
  })

  async function handleGoogleRegister() {
    setGoogleLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/investors/auth/google")
      const data = await res.json()
      if (data.auth_url && data.state) {
        localStorage.setItem("investor_oauth_state", data.state)
        window.location.href = data.auth_url
      } else {
        throw new Error(data.error || "Error iniciando registro con Google")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error con Google")
      setGoogleLoading(false)
    }
  }

  async function handleAppleRegister() {
    setAppleLoading(true)
    setError(null)
    try {
      setError("Apple Sign-In no está disponible todavía")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error con Apple")
    } finally {
      setAppleLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }
    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }
    if (!formData.acceptTerms || !formData.acceptPrivacy) {
      setError("Debes aceptar los términos y la política de privacidad")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/investors/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone || undefined,
          password: formData.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al registrar")
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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
            />
          </div>
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-[#164AA6]">Registro completado</CardTitle>
          <CardDescription className="text-base text-[#777777]">
            Hemos enviado un email de verificación a <strong className="text-[#164AA6]">{formData.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-[#777777] px-8">
          <p>Por favor, verifica tu email para activar tu cuenta.</p>
          <p className="mt-2 text-sm">El enlace expirará en 24 horas.</p>
        </CardContent>
        <CardFooter className="px-8 pb-8">
          <Button asChild className="w-full h-12 bg-[#164AA6] hover:bg-[#123d8a] text-white font-medium rounded-lg">
            <Link href="/investor-portal/login">Ir al login</Link>
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
            width={64}
            height={64}
            className="h-16 w-16"
          />
        </div>
        <CardTitle className="text-2xl font-bold text-[#164AA6]">Crear cuenta</CardTitle>
        <CardDescription className="text-[#777777]">Regístrate como inversor en Urbix</CardDescription>
      </CardHeader>
      <CardContent className="px-8 pt-2">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm text-center border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-3 font-medium bg-white border-[#E6E6E6] hover:bg-[#F2F2F2] hover:border-[#164AA6] rounded-lg transition-all"
            onClick={handleGoogleRegister}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5">
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
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
                />
              </svg>
            )}
            Registrarse con Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-3 font-medium bg-white border-[#E6E6E6] hover:bg-[#F2F2F2] rounded-lg transition-all"
            onClick={handleAppleRegister}
            disabled={appleLoading}
          >
            {appleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
            )}
            Registrarse con Apple
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[#E6E6E6]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-[#777777]">o con email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-[#777777] font-medium">
                Nombre
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777777]" />
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Juan"
                  className="pl-10 h-11 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6] rounded-lg"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-[#777777] font-medium">
                Apellidos
              </Label>
              <Input
                id="lastName"
                type="text"
                placeholder="García"
                className="h-11 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6] rounded-lg"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#777777] font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777777]" />
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                className="pl-10 h-11 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6] rounded-lg"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-[#777777] font-medium">
              Teléfono (opcional)
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777777]" />
              <Input
                id="phone"
                type="tel"
                placeholder="+34 600 000 000"
                className="pl-10 h-11 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6] rounded-lg"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#777777] font-medium">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777777]" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-11 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6] rounded-lg"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <p className="text-xs text-[#777777]">Mínimo 8 caracteres</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-[#777777] font-medium">
              Confirmar contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777777]" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-11 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6] rounded-lg"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={formData.acceptTerms}
                onCheckedChange={(checked) => setFormData({ ...formData, acceptTerms: checked === true })}
                className="border-[#E6E6E6] data-[state=checked]:bg-[#164AA6] data-[state=checked]:border-[#164AA6]"
              />
              <label htmlFor="terms" className="text-sm text-[#777777] leading-tight">
                Acepto los{" "}
                <a href="/terms" className="text-[#164AA6] hover:text-[#0FB7EA] hover:underline">
                  términos y condiciones
                </a>
              </label>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="privacy"
                checked={formData.acceptPrivacy}
                onCheckedChange={(checked) => setFormData({ ...formData, acceptPrivacy: checked === true })}
                className="border-[#E6E6E6] data-[state=checked]:bg-[#164AA6] data-[state=checked]:border-[#164AA6]"
              />
              <label htmlFor="privacy" className="text-sm text-[#777777] leading-tight">
                Acepto la{" "}
                <a href="/privacy" className="text-[#164AA6] hover:text-[#0FB7EA] hover:underline">
                  política de privacidad
                </a>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-[#164AA6] hover:bg-[#123d8a] text-white font-medium rounded-lg transition-all"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                Crear cuenta
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 text-center text-sm text-[#777777] border-t border-[#E6E6E6] pt-6 pb-8 mx-8">
        <p>
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/investor-portal/login"
            className="text-[#164AA6] hover:text-[#0FB7EA] hover:underline font-semibold transition-colors"
          >
            Inicia sesión
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
