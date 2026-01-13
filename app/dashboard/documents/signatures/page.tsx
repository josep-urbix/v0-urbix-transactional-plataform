import { getServerSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SignaturesManager } from "@/components/documents/signatures-manager"
import { isAdminRole } from "@/lib/auth"

export default async function SignaturesPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documentos Firmados</h1>
        <p className="text-gray-600 mt-1">Consulta y gestiona los documentos firmados por inversores</p>
      </div>

      <SignaturesManager />
    </div>
  )
}
