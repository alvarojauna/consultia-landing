import DashboardOverviewClient from './overview-client'

export async function generateStaticParams() {
  return [{ customerId: '_' }]
}

export default function DashboardOverviewPage() {
  return <DashboardOverviewClient />
}
