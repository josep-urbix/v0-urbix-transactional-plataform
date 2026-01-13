import { Suspense } from "react"
import { InvestorPortalSettings } from "@/components/settings/investor-portal-settings"

export const metadata = {
  title: "Investor Portal Settings",
  description: "Configure investor portal authentication and features",
}

export default function InvestorPortalSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Investor Portal Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure authentication methods and features for the investor portal
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <InvestorPortalSettings />
      </Suspense>
    </div>
  )
}
