import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { GoogleCallback } from "@/components/investor-portal/google-callback"

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <GoogleCallback />
    </Suspense>
  )
}
