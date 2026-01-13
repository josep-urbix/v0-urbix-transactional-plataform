"use client"

import { useDesktopAuth } from "@/desktop/hooks/use-desktop-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Wallet, TrendingUp, FileText, Shield, Settings, LogOut, Bell, ChevronRight } from "lucide-react"

export function InvestorDashboard() {
  const { user, logout } = useDesktopAuth()

  if (!user) return null

  const initials =
    user.first_name && user.last_name ? `${user.first_name[0]}${user.last_name[0]}` : user.email[0].toUpperCase()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Urbix Inversores</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || "/placeholder.svg"} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">
            Hola, {user.display_name || user.first_name || user.email.split("@")[0]}
          </h2>
          <p className="text-muted-foreground">Bienvenido a tu panel de inversiones</p>
        </div>

        {/* KYC Alert */}
        {user.kyc_status !== "approved" && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Verificación de identidad pendiente</p>
                  <p className="text-sm text-orange-700">Completa tu KYC para acceder a todas las funcionalidades</p>
                </div>
              </div>
              <Button size="sm">
                Verificar ahora
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0,00 €</div>
              <p className="text-xs text-muted-foreground">Disponible para invertir</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inversiones Activas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Proyectos en cartera</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rendimiento</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+0,00%</div>
              <p className="text-xs text-muted-foreground">Rentabilidad acumulada</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
              <CardDescription>Operaciones frecuentes</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 bg-transparent">
                <Wallet className="h-5 w-5" />
                <span>Añadir fondos</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 bg-transparent">
                <TrendingUp className="h-5 w-5" />
                <span>Ver proyectos</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 bg-transparent">
                <FileText className="h-5 w-5" />
                <span>Mis documentos</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2 bg-transparent">
                <Shield className="h-5 w-5" />
                <span>Seguridad</span>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tu Cuenta</CardTitle>
              <CardDescription>Información de tu perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <div className="flex items-center gap-2">
                  <span>{user.email}</span>
                  {user.email_verified && (
                    <Badge variant="outline" className="text-green-600">
                      Verificado
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">KYC</span>
                <Badge variant={user.kyc_status === "approved" ? "default" : "secondary"}>
                  {user.kyc_status === "approved"
                    ? "Aprobado"
                    : user.kyc_status === "pending"
                      ? "Pendiente"
                      : "Sin verificar"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">2FA</span>
                <Badge variant={user.two_factor_enabled ? "default" : "secondary"}>
                  {user.two_factor_enabled ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Tus últimos movimientos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay actividad reciente</p>
              <p className="text-sm mt-2">Tus movimientos aparecerán aquí</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
