'use client'

import { useState, useEffect } from 'react'
import { useOnboarding } from '@/lib/onboarding-context'
import { api, Plan } from '@/lib/api'
import { CreditCardIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function Step6Payment() {
  const { state, updateState } = useOnboarding()
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedTier, setSelectedTier] = useState(state.planTier || '')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>(state.billingPeriod)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [completed, setCompleted] = useState(false)
  const [dashboardUrl, setDashboardUrl] = useState('')

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const result = await api.getPlans()
        setPlans(result)
      } catch (err: any) {
        setError('Error al cargar los planes. Inténtalo de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchPlans()
  }, [])

  const selectedPlan = plans.find((p) => p.tier === selectedTier)

  const price = selectedPlan
    ? billingPeriod === 'yearly'
      ? selectedPlan.price_yearly
      : selectedPlan.price_monthly
    : 0

  const handleSubmit = async () => {
    if (!selectedTier) {
      setError('Selecciona un plan')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Step 1: Select plan
      await api.selectPlan(
        state.customerId!,
        selectedTier,
        billingPeriod,
        selectedPlan!.minutes_included
      )

      updateState({
        planTier: selectedTier,
        billingPeriod,
      })

      // Step 2: Complete payment (backend handles Stripe checkout redirect)
      const result = await api.completePayment(state.customerId!, '')
      setDashboardUrl(result.dashboard_url)
      setCompleted(true)
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in text-center py-12">
        <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-text-secondary">Cargando planes...</p>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="animate-fade-in text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-6">
          <CheckIcon className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-3">
          ¡Todo listo!
        </h1>
        <p className="text-text-secondary mb-2">
          Tu agente AI está activo y listo para recibir llamadas.
        </p>
        <p className="text-text-muted text-sm mb-8">
          Número asignado: <span className="text-white font-medium">{state.phoneNumber || 'Pendiente'}</span>
        </p>

        <a
          href={dashboardUrl || '/dashboard'}
          className="inline-flex items-center gap-2 py-3 px-8 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          Ir al dashboard
        </a>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <CreditCardIcon className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
          Elige tu plan
        </h1>
        <p className="text-text-secondary">
          Selecciona el plan que mejor se adapte a tu volumen de llamadas.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span
          className={`text-sm ${billingPeriod === 'monthly' ? 'text-white font-medium' : 'text-text-muted'}`}
        >
          Mensual
        </span>
        <button
          type="button"
          onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            billingPeriod === 'yearly' ? 'bg-primary' : 'bg-dark-light'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span
          className={`text-sm ${billingPeriod === 'yearly' ? 'text-white font-medium' : 'text-text-muted'}`}
        >
          Anual <span className="text-green-400 text-xs">(-20%)</span>
        </span>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {plans.map((plan) => {
          const isSelected = selectedTier === plan.tier
          const displayPrice = billingPeriod === 'yearly' ? plan.price_yearly : plan.price_monthly

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedTier(plan.tier)}
              className={`
                relative p-5 rounded-xl border text-left transition-all duration-200
                ${isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-white/10 bg-dark-lighter hover:border-white/20'}
                ${plan.tier === 'professional' && !isSelected ? 'border-primary/30' : ''}
              `}
            >
              {plan.tier === 'professional' && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-xs font-medium rounded-full">
                  Popular
                </span>
              )}

              <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>

              <div className="mb-3">
                <span className="text-2xl font-bold text-white">{displayPrice}€</span>
                <span className="text-text-muted text-sm">/mes</span>
              </div>

              <p className="text-sm text-text-secondary mb-3">
                {plan.minutes_included} minutos incluidos
              </p>

              <ul className="space-y-1.5">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                    <CheckIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {/* Summary */}
      {selectedPlan && (
        <div className="p-4 bg-dark-lighter rounded-xl border border-white/10 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Plan seleccionado</span>
            <span className="text-white font-medium">{selectedPlan.name}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-text-secondary">Facturación</span>
            <span className="text-white">{billingPeriod === 'yearly' ? 'Anual' : 'Mensual'}</span>
          </div>
          <div className="border-t border-white/5 mt-3 pt-3 flex items-center justify-between">
            <span className="text-text-primary font-medium">Total</span>
            <span className="text-xl text-white font-bold">
              {price}€<span className="text-text-muted text-sm font-normal">/mes</span>
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selectedTier || saving}
        className="w-full py-3 px-6 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Procesando...
          </>
        ) : (
          'Activar plan'
        )}
      </button>

      <p className="mt-3 text-xs text-text-muted text-center">
        Se te redirigirá a Stripe para completar el pago de forma segura.
      </p>
    </div>
  )
}
