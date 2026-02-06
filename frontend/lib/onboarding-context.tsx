'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface OnboardingState {
  customerId: string | null
  currentStep: number
  // Step 1 data
  website: string
  countryCode: string
  // Step 2 data
  businessName: string
  businessAddress: string
  businessPhone: string
  industry: string
  services: string[]
  hours: Record<string, string>
  // Step 3 data
  voiceId: string
  voiceName: string
  // Step 5 data
  agentId: string | null
  phoneNumber: string | null
  // Step 6 data
  planTier: string | null
  billingPeriod: 'monthly' | 'yearly'
}

const initialState: OnboardingState = {
  customerId: null,
  currentStep: 1,
  website: '',
  countryCode: '+34',
  businessName: '',
  businessAddress: '',
  businessPhone: '',
  industry: '',
  services: [],
  hours: {},
  voiceId: '',
  voiceName: '',
  agentId: null,
  phoneNumber: null,
  planTier: null,
  billingPeriod: 'monthly',
}

interface OnboardingContextType {
  state: OnboardingState
  updateState: (updates: Partial<OnboardingState>) => void
  nextStep: () => void
  goToStep: (step: number) => void
  reset: () => void
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    // Restore from sessionStorage if available
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('consultia_onboarding')
      if (saved) {
        try {
          return { ...initialState, ...JSON.parse(saved) }
        } catch {}
      }
    }
    return initialState
  })

  const persist = useCallback((newState: OnboardingState) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('consultia_onboarding', JSON.stringify(newState))
    }
  }, [])

  const updateState = useCallback((updates: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev, ...updates }
      persist(next)
      return next
    })
  }, [persist])

  const nextStep = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, currentStep: Math.min(prev.currentStep + 1, 6) }
      persist(next)
      return next
    })
  }, [persist])

  const goToStep = useCallback((step: number) => {
    setState((prev) => {
      const next = { ...prev, currentStep: step }
      persist(next)
      return next
    })
  }, [persist])

  const reset = useCallback(() => {
    setState(initialState)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('consultia_onboarding')
    }
  }, [])

  return (
    <OnboardingContext.Provider value={{ state, updateState, nextStep, goToStep, reset }}>
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider')
  return ctx
}
