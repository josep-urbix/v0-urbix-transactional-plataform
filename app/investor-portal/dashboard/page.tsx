"use client"

import { useInvestorAuth } from "@/hooks/use-investor-auth"
import { InvestorDashboard } from "@/components/investor-portal/investor-dashboard"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function InvestorDashboardPage() {
  const { user, loading, initialized } = useInvestorAuth() as any
  const router = useRouter()

  useEffect(() => {
    if (initialized && !loading && !user) {
      console.log("[v0] Dashboard - no user after init, redirecting to login")
      router.replace("/investor-portal/login")
    }
  }, [initialized, loading, user, router])

  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#164AA6] mx-auto" />
          <p className="mt-4 text-[#777777]">Cargando tu panel...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <InvestorDashboard />
}
