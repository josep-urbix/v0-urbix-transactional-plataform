import { requireAuth } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ChangePasswordForm } from "@/components/change-password-form"

export const metadata = {
  title: "Perfil de Usuario - URBIX",
  description: "Gestionar configuración de tu cuenta personal",
}

export const dynamic = "force-dynamic"

export default async function UserSettingsPage() {
  const session = await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Perfil de Usuario</h2>
        <p className="text-muted-foreground">Gestiona tu cuenta personal y configuración de seguridad</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Cuenta</CardTitle>
          <CardDescription>Tus datos personales y de acceso</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-1">Email</h3>
            <p className="text-sm text-muted-foreground">{session.user.email}</p>
          </div>
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-1">Rol</h3>
            <p className="text-sm text-muted-foreground capitalize">{session.user.role}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
          <CardDescription>Gestiona tu contraseña y configuración de seguridad</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <h3 className="text-sm font-medium mb-3">Cambiar Contraseña</h3>
            <ChangePasswordForm />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
