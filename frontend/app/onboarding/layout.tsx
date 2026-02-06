import { OnboardingProvider } from '@/lib/onboarding-context'

export const metadata = {
  title: 'Crear tu agente AI - ConsultIA',
  description: 'Configura tu recepcionista AI en 6 sencillos pasos',
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      {children}
    </OnboardingProvider>
  )
}
