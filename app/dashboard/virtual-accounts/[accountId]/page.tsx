import { VirtualAccountDetail } from "@/components/virtual-accounts/virtual-account-detail"

export const metadata = {
  title: "Detalle de Cuenta Virtual - URBIX",
  description: "Detalle de cuenta virtual",
}

export default function VirtualAccountDetailPage({ params }: { params: { accountId: string } }) {
  return <VirtualAccountDetail accountId={params.accountId} />
}
