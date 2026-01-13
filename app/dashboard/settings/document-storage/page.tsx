import { getServerSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DocumentStorageSettings } from "@/components/settings/document-storage-settings"
import { isAdminRole } from "@/lib/auth"

export default async function DocumentStoragePage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/login")
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Documentos</h1>
        <p className="text-gray-600 mt-1">
          Configura el almacenamiento de PDFs y parámetros de firma del módulo documental
        </p>
      </div>

      <DocumentStorageSettings />
    </div>
  )
}
