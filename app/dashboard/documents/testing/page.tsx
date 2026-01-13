import { getSession, isAdminRole } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DocumentTestingManager } from "@/components/documents/document-testing-manager"

export const metadata = {
  title: "Testing Documentos",
  description: "Interfaz de prueba para firma de documentos",
}

export default async function DocumentTestingPage() {
  const session = await getSession()

  if (!session || !isAdminRole(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6">
      <DocumentTestingManager />
    </div>
  )
}
