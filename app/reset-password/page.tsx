import { ResetPasswordForm } from "@/components/reset-password-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Suspense } from "react"

export const metadata = {
  title: "Restablecer Contraseña - URBIX",
  description: "Crea una nueva contraseña para tu cuenta",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export const dynamic = "force-dynamic"

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Restablecer Contraseña</CardTitle>
          <CardDescription>Ingresa tu nueva contraseña</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={<div className="text-center">Cargando...</div>}>
            <ResetPasswordForm />
          </Suspense>
          <div className="text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              Volver al inicio de sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
