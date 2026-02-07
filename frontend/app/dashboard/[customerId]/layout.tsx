import DashboardLayoutClient from './layout-client'

export async function generateStaticParams() {
  return [{ customerId: '_' }]
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}
