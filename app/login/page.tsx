import { LoginForm } from "@/components/login-form"
import Image from "next/image"

export const metadata = {
  title: "Login - URBIX",
  description: "Accede al panel de administración",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex font-sans">
      {/* Panel izquierdo - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#164AA6] flex-col justify-between p-12 relative overflow-hidden">
        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border border-white rounded-full" />
          <div className="absolute bottom-40 right-10 w-96 h-96 border border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-white rounded-full" />
        </div>

        {/* Logo y título */}
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <Image
              src="/images/urbix-logo-horizontal.png"
              alt="URBIX Logo"
              width={180}
              height={60}
              className="h-14 w-auto"
              priority
            />
          </div>
        </div>

        {/* Contenido central */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
            Panel de
            <br />
            Administración
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Gestiona inversores, transacciones, wallets y configuraciones desde un único lugar.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <div className="text-3xl font-bold text-[#0FB7EA]">100%</div>
              <div className="text-white/60 text-sm">Seguro</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#0FB7EA]">24/7</div>
              <div className="text-white/60 text-sm">Disponible</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-[#0FB7EA]">Real-time</div>
              <div className="text-white/60 text-sm">Datos</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-white/50 text-sm">
          © {new Date().getFullYear()} URBIX. Todos los derechos reservados.
        </div>
      </div>

      {/* Panel derecho - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#F2F2F2] p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo móvil */}
          <div className="lg:hidden flex flex-col items-center space-y-4">
            <Image
              src="/images/urbix-logo-horizontal.png"
              alt="URBIX Logo"
              width={180}
              height={60}
              className="h-14 w-auto"
              priority
            />
          </div>

          {/* Card de login */}
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-[#164AA6]">Bienvenido</h2>
              <p className="text-[#777777]">Accede con tu cuenta de URBIX</p>
            </div>

            <LoginForm />

            <div className="text-center text-xs text-[#777777]">Acceso restringido a personal autorizado de URBIX</div>
          </div>

          {/* Footer móvil */}
          <div className="lg:hidden text-center text-[#777777] text-sm">
            © {new Date().getFullYear()} URBIX. Todos los derechos reservados.
          </div>
        </div>
      </div>
    </div>
  )
}
