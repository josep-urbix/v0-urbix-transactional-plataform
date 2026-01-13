import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { MagicLinkVerify } from "@/components/investor-portal/magic-link-verify"

export default function MagicLinkVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <MagicLinkVerify />
    </Suspense>
  )
}
