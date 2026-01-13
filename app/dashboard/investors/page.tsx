import { InvestorsList } from "@/components/investors/investors-list"

export default function InvestorsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Inversores</h1>
        <p className="text-muted-foreground">Gestión de usuarios inversores de desktop.urbix.es</p>
      </div>
      <InvestorsList />
    </div>
  )
}
