import { InvestorRegisterForm } from "@/components/investor-portal/register-form"

export const metadata = {
  title: "Crear Cuenta - Urbix Inversores",
  description: "Regístrate como inversor en Urbix",
}

export default function InvestorRegisterPage() {
  return (
    <div className="min-h-screen bg-[#F2F2F2] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <InvestorRegisterForm />
      </div>
      <footer className="py-4 text-center text-sm text-[#777777]">
        <p>© 2026 Urbix. Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
