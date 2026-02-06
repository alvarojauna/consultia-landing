'use client'

import { useOnboarding } from '@/lib/onboarding-context'
import Stepper from '@/components/onboarding/Stepper'
import Step1BusinessInfo from '@/components/onboarding/Step1BusinessInfo'
import Step2ConfirmBusiness from '@/components/onboarding/Step2ConfirmBusiness'
import Step3SelectVoice from '@/components/onboarding/Step3SelectVoice'
import Step4KnowledgeBase from '@/components/onboarding/Step4KnowledgeBase'
import Step5TestAgent from '@/components/onboarding/Step5TestAgent'
import Step6Payment from '@/components/onboarding/Step6Payment'
import Link from 'next/link'

export default function OnboardingPage() {
  const { state, goToStep } = useOnboarding()

  const renderStep = () => {
    switch (state.currentStep) {
      case 1: return <Step1BusinessInfo />
      case 2: return <Step2ConfirmBusiness />
      case 3: return <Step3SelectVoice />
      case 4: return <Step4KnowledgeBase />
      case 5: return <Step5TestAgent />
      case 6: return <Step6Payment />
      default: return <Step1BusinessInfo />
    }
  }

  return (
    <main className="min-h-screen bg-dark">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-heading font-bold text-white">
            Consult<span className="text-primary">IA</span>
          </Link>
          <span className="text-sm text-text-secondary">
            Paso {state.currentStep} de 6
          </span>
        </div>
      </header>

      {/* Stepper */}
      <Stepper currentStep={state.currentStep} onStepClick={goToStep} />

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {renderStep()}
      </div>
    </main>
  )
}
