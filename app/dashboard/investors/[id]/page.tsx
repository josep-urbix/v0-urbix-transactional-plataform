import { InvestorDetail } from "@/components/investors/investor-detail"

export default async function InvestorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="container mx-auto py-6">
      <InvestorDetail investorId={id} />
    </div>
  )
}
