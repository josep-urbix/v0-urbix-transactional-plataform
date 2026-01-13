import { DesktopLoginForm } from "@/desktop/components/auth/login-form"
import { DesktopAuthProvider } from "@/desktop/hooks/use-desktop-auth"

export default function DesktopLoginPage() {
  return (
    <DesktopAuthProvider>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Urbix Inversores</h1>
            <p className="text-muted-foreground">Plataforma de inversiones</p>
          </div>
          <DesktopLoginForm />
        </div>
      </div>
    </DesktopAuthProvider>
  )
}
