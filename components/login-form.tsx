"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"
import { Loader2, Mail, Lock, ChevronDown, ChevronUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showEmailLogin, setShowEmailLogin] = useState(false)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || "Error de autenticación")
        setIsLoading(false)
        return
      }

      const data = await response.json()
      toast.success("Sesión iniciada correctamente")
      router.push("/dashboard")
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Error durante el inicio de sesión")
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      const response = await fetch("/api/auth/google")
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Error al iniciar autenticación con Google")
        setIsGoogleLoading(false)
        return
      }

      if (data.auth_url && data.state) {
        localStorage.setItem("admin_oauth_state", data.state)
        window.location.href = data.auth_url
      } else {
        toast.error("Error de configuración OAuth")
        setIsGoogleLoading(false)
      }
    } catch (error) {
      console.error("Google login error:", error)
      toast.error("Error al conectar con Google")
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Botón principal de Google */}
      <Button
        type="button"
        className="w-full h-12 bg-white hover:bg-gray-50 text-[#333] border-2 border-[#E6E6E6] hover:border-[#164AA6] shadow-sm transition-all duration-200"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading || isLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-3 h-5 w-5 animate-spin text-[#164AA6]" />
        ) : (
          <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
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
        )}
        <span className="font-medium">{isGoogleLoading ? "Conectando..." : "Continuar con Google"}</span>
      </Button>

      <p className="text-center text-xs text-[#777777]">Usa tu cuenta @urbix.es para acceder</p>

      {/* Sección colapsable para email/password */}
      <Collapsible open={showEmailLogin} onOpenChange={setShowEmailLogin}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 text-sm text-[#777777] hover:text-[#164AA6] transition-colors py-2"
          >
            <span>Acceder con email y contraseña</span>
            {showEmailLogin ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#E6E6E6]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-[#777777]">Email</span>
            </div>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#777777] text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777777]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@urbix.es"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading || isGoogleLoading}
                  autoComplete="email"
                  className="pl-10 h-11 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#777777] text-sm font-medium">
                  Contraseña
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-[#0FB7EA] hover:text-[#164AA6] hover:underline transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777777]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || isGoogleLoading}
                  autoComplete="current-password"
                  className="pl-10 h-11 border-[#E6E6E6] focus:border-[#164AA6] focus:ring-[#164AA6]"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-[#164AA6] hover:bg-[#0FB7EA] text-white transition-colors font-medium"
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar sesión"
              )}
            </Button>
          </form>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
