import { getInvestorSession } from "@/lib/investor-auth/session"
import { redirect } from "next/navigation"
import { InvestorDocuments } from "@/components/investor-portal/investor-documents"

export const dynamic = "force-dynamic"

export default async function InvestorDocumentsPage() {
  const session = await getInvestorSession()

  if (!session) {
    redirect("/investor-portal/login")
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Documentos</h1>
        <p className="text-gray-600 mt-1">Gestiona y firma los documentos necesarios para tus inversiones</p>
      </div>

      <InvestorDocuments />
    </div>
  )
}
