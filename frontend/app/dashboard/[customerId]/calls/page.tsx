import CallsClient from './calls-client'

export async function generateStaticParams() {
  return [{ customerId: '_' }]
}

export default function CallsPage() {
  return <CallsClient />
}
