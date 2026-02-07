import AgentSettingsClient from './agent-client'

export async function generateStaticParams() {
  return [{ customerId: '_' }]
}

export default function AgentSettingsPage() {
  return <AgentSettingsClient />
}
