import { InvestorDashboard } from "@/desktop/components/dashboard/investor-dashboard"
import { DesktopAuthProvider } from "@/desktop/hooks/use-desktop-auth"

export default function DesktopDashboardPage() {
  return (
    <DesktopAuthProvider>
      <InvestorDashboard />
    </DesktopAuthProvider>
  )
}
