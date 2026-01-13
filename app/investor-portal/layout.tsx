import type React from "react"
import { InvestorAuthProvider } from "@/hooks/use-investor-auth"

export const metadata = {
  title: "Urbix Dashboard de Inversores",
  description: "Portal de inversores de Urbix",
}

export default function InvestorPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <InvestorAuthProvider>{children}</InvestorAuthProvider>
}
