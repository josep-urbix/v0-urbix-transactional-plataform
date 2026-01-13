import { LemonwayWebhookDetail } from "@/components/lemonway-webhook-detail"

export default async function LemonwayWebhookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return <LemonwayWebhookDetail webhookId={id} />
}
