"use client"

import { useInvestorAuth } from "@/hooks/use-investor-auth"
import { InvestorSettings } from "@/components/investor-portal/investor-settings"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function PasswordSettingsPage() {
  const { user, loading } = useInvestorAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/investor-portal/login")
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0066CC]" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <InvestorSettings user={user} defaultTab="password" />
}
