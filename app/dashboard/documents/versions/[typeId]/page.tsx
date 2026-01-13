import { getServerSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DocumentVersionsManager } from "@/components/documents/document-versions-manager"
import { isAdminRole } from "@/lib/auth"

export default async function DocumentVersionsPage({ params }: { params: Promise<{ typeId: string }> }) {
  const session = await getServerSession()
  const { typeId } = await params

  if (!session) {
    redirect("/login")
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <DocumentVersionsManager typeId={typeId} />
    </div>
  )
}
