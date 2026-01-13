import { InvestorLoginForm } from "@/components/investor-portal/login-form"

export const metadata = {
  title: "Iniciar Sesión - Urbix Inversores",
  description: "Accede a tu cuenta de inversor en Urbix",
}

export default function InvestorLoginPage() {
  return (
    <div className="min-h-screen bg-[#F2F2F2] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <InvestorLoginForm />
      </div>
      <footer className="py-4 text-center text-sm text-[#777777]">
        <p>© 2026 Urbix. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
