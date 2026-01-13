import { getServerSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DocumentTypesManager } from "@/components/documents/document-types-manager"
import { isAdminRole } from "@/lib/auth"

export default async function DocumentsPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">Gestión Documental</h1>
        <p className="text-gray-600 mt-1">
          Administra los tipos de documentos, versiones y plantillas para el portal de inversores
        </p>
      </div>

      <DocumentTypesManager />
    </div>
  )
}
