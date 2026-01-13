"use client"

import { useInvestorAuth } from "@/hooks/use-investor-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Wallet,
  TrendingUp,
  FileText,
  Shield,
  Settings,
  LogOut,
  Bell,
  ChevronRight,
  Building2,
  PiggyBank,
  History,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function InvestorDashboard() {
  const { user, logout, paymentAccount, paymentAccountLoading } = useInvestorAuth()

  if (!user) return null

  const initials =
    user.first_name && user.last_name ? `${user.first_name[0]}${user.last_name[0]}` : user.email[0].toUpperCase()

  const isKycVerified = paymentAccount?.status === "6"
  const walletNumber = paymentAccount?.accountId || null
  const balance = paymentAccount?.balance || 0

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      <header className="bg-white border-b border-[#E6E6E6] sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/images/captura-20de-20pantalla-202026-01-04-20a-20les-2017.png"
              alt="URBIX"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <h1 className="text-xl font-bold text-[#164AA6]">Inversores</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#0FB7EA] rounded-full" />
            </Button>
            <Link href="/investor-portal/settings">
              <Button variant="ghost" size="icon" className="text-[#777777] hover:text-[#164AA6] hover:bg-[#F2F2F2]">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3 ml-2 pl-4 border-l border-[#E6E6E6]">
              <Avatar className="h-9 w-9 border-2 border-[#164AA6]/20">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-[#164AA6]/10 text-[#164AA6] font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-[#164AA6] leading-none">
                  {user.display_name || user.first_name || user.email.split("@")[0]}
                </p>
                <p className="text-xs text-[#777777]">{user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-[#777777] hover:text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-[#164AA6] mb-2">
            Hola, {user.display_name || user.first_name || user.email.split("@")[0]}
          </h2>
          <p className="text-[#777777]">Bienvenido a tu panel de inversiones</p>
        </div>

        {!isKycVerified && !paymentAccountLoading && (
          <Card className="mb-6 border-[#0FB7EA]/30 bg-[#0FB7EA]/5 shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#0FB7EA]/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-[#0FB7EA]" />
                </div>
                <div>
                  <p className="font-semibold text-[#164AA6]">Verificación de identidad pendiente</p>
                  <p className="text-sm text-[#777777]">Completa tu KYC para acceder a todas las funcionalidades</p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-[#0FB7EA] hover:bg-[#0da5d4] text-white font-medium rounded-lg w-full sm:w-auto"
              >
                Verificar ahora
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 2FA Alert */}
        {!user.two_factor_enabled && (
          <Card className="mb-6 border-[#164AA6]/20 bg-[#164AA6]/5 shadow-sm">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#164AA6]/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-[#164AA6]" />
                </div>
                <div>
                  <p className="font-semibold text-[#164AA6]">Activa la autenticación en dos pasos</p>
                  <p className="text-sm text-[#777777]">Protege tu cuenta con una capa extra de seguridad</p>
                </div>
              </div>
              <Link href="/investor-portal/settings/security">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#164AA6] text-[#164AA6] hover:bg-[#164AA6] hover:text-white bg-white font-medium rounded-lg w-full sm:w-auto"
                >
                  Activar 2FA
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="bg-gradient-to-br from-[#164AA6] to-[#123d8a] text-white shadow-lg border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Saldo Disponible</CardTitle>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              {paymentAccountLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-white/70" />
                  <span className="text-white/70">Cargando...</span>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {balance.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                  </div>
                  <p className="text-xs text-white/70 mt-1">Disponible para invertir</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-[#E6E6E6]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#777777]">Inversiones Activas</CardTitle>
              <div className="w-10 h-10 rounded-full bg-[#F2F2F2] flex items-center justify-center">
                <Building2 className="h-5 w-5 text-[#777777]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#164AA6]">0</div>
              <p className="text-xs text-[#777777] mt-1">Proyectos en cartera</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-[#E6E6E6]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#777777]">Total Invertido</CardTitle>
              <div className="w-10 h-10 rounded-full bg-[#F2F2F2] flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-[#777777]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#164AA6]">0,00 €</div>
              <p className="text-xs text-[#777777] mt-1">Capital comprometido</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-[#E6E6E6]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[#777777]">Rendimiento</CardTitle>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">+0,00%</div>
              <p className="text-xs text-[#777777] mt-1">Rentabilidad acumulada</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Quick Actions */}
          <Card className="lg:col-span-2 bg-white shadow-sm border-[#E6E6E6]">
            <CardHeader>
              <CardTitle className="text-[#164AA6]">Acciones Rápidas</CardTitle>
              <CardDescription className="text-[#777777]">Operaciones frecuentes</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col gap-3 hover:bg-[#164AA6]/5 hover:border-[#164AA6] border-[#E6E6E6] bg-white rounded-xl transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-[#164AA6]/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-[#164AA6]" />
                </div>
                <span className="font-medium text-[#164AA6]">Añadir fondos</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-6 flex flex-col gap-3 hover:bg-[#164AA6]/5 hover:border-[#164AA6] border-[#E6E6E6] bg-white rounded-xl transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-[#164AA6]/10 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-[#164AA6]" />
                </div>
                <span className="font-medium text-[#164AA6]">Ver proyectos</span>
              </Button>
              <Link href="/investor-portal/documents" className="block">
                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col gap-3 w-full hover:bg-[#164AA6]/5 hover:border-[#164AA6] border-[#E6E6E6] bg-white rounded-xl transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-[#164AA6]/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-[#164AA6]" />
                  </div>
                  <span className="font-medium text-[#164AA6]">Mis documentos</span>
                </Button>
              </Link>
              <Link href="/investor-portal/settings/security" className="block">
                <Button
                  variant="outline"
                  className="h-auto py-6 flex flex-col gap-3 w-full hover:bg-[#164AA6]/5 hover:border-[#164AA6] border-[#E6E6E6] bg-white rounded-xl transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-[#164AA6]/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-[#164AA6]" />
                  </div>
                  <span className="font-medium text-[#164AA6]">Seguridad</span>
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="bg-white shadow-sm border-[#E6E6E6]">
            <CardHeader>
              <CardTitle className="text-[#164AA6]">Tu Cuenta</CardTitle>
              <CardDescription className="text-[#777777]">Información de tu perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[#E6E6E6]">
                <span className="text-[#777777]">Email</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm truncate max-w-[120px] sm:max-w-[150px] text-[#164AA6] font-medium">
                    {user.email}
                  </span>
                  {user.email_verified && (
                    <Badge className="bg-green-100 text-green-700 border-0 font-medium">Verificado</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#E6E6E6]">
                <span className="text-[#777777]">KYC</span>
                {paymentAccountLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#777777]" />
                ) : (
                  <Badge
                    className={
                      isKycVerified
                        ? "bg-green-100 text-green-700 border-0 font-medium"
                        : "bg-[#E6E6E6] text-[#777777] border-0"
                    }
                  >
                    {isKycVerified ? "Activo" : "Pendiente"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#E6E6E6]">
                <span className="text-[#777777]">Wallet número</span>
                {paymentAccountLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#777777]" />
                ) : walletNumber ? (
                  <Badge variant="outline" className="border-[#164AA6] text-[#164AA6] font-mono font-medium">
                    {walletNumber}
                  </Badge>
                ) : (
                  <Badge className="bg-[#E6E6E6] text-[#777777] border-0">Sin asignar</Badge>
                )}
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[#777777]">2FA</span>
                <Badge
                  className={
                    user.two_factor_enabled
                      ? "bg-green-100 text-green-700 border-0 font-medium"
                      : "bg-[#E6E6E6] text-[#777777] border-0"
                  }
                >
                  {user.two_factor_enabled ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white shadow-sm border-[#E6E6E6]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[#164AA6]">Actividad Reciente</CardTitle>
              <CardDescription className="text-[#777777]">Tus últimos movimientos</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-[#164AA6] hover:bg-[#164AA6]/5">
              <History className="h-4 w-4 mr-2" />
              Ver todo
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-[#777777]">
              <div className="w-16 h-16 rounded-full bg-[#F2F2F2] mx-auto mb-4 flex items-center justify-center">
                <History className="h-8 w-8 text-[#777777]" />
              </div>
              <p className="font-medium text-[#164AA6]">No hay actividad reciente</p>
              <p className="text-sm mt-1">Tus movimientos aparecerán aquí</p>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-[#E6E6E6] bg-white mt-8">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-[#777777]">
          <p>© 2026 Urbix. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
