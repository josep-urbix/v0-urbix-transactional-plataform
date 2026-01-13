import { InvestorSettings } from "@/components/investors/investor-settings"

export default function InvestorSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración OAuth (Inversores y Promotores)</h1>
        <p className="text-muted-foreground">Gestiona la configuración de OAuth, Apple Sign-In y opciones del portal</p>
      </div>

      <InvestorSettings />
    </div>
  )
}
