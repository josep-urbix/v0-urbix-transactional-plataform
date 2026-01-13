import { Suspense } from "react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { VerifyEmailContent } from "@/components/investor-portal/verify-email-content"

function LoadingCard() {
  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <CardTitle className="text-2xl">Cargando...</CardTitle>
      </CardHeader>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Suspense fallback={<LoadingCard />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
