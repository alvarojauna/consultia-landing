import BillingClient from './billing-client'

export async function generateStaticParams() {
  return [{ customerId: '_' }]
}

export default function BillingPage() {
  return <BillingClient />
}
