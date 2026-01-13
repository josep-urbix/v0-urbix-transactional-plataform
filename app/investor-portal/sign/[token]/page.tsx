import { SigningPage } from "@/components/investor-portal/signing-page"

export default async function SignTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  return <SigningPage token={token} />
}
