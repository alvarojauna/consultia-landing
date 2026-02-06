'use client'

import { useState } from 'react'
import { useOnboarding } from '@/lib/onboarding-context'
import { api } from '@/lib/api'
import { GlobeAltIcon } from '@heroicons/react/24/outline'

export default function Step1BusinessInfo() {
  const { state, updateState, nextStep } = useOnboarding()
  const [website, setWebsite] = useState(state.website || '')
  const [countryCode, setCountryCode] = useState(state.countryCode || '+34')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic validation
    if (!website.trim()) {
      setError('Introduce la URL de tu negocio')
      return
    }

    setLoading(true)

    try {
      const result = await api.submitBusinessInfo({
        website: website.startsWith('http') ? website : `https://${website}`,
        country_code: countryCode,
      })

      updateState({
        customerId: result.customer_id,
        website,
        countryCode,
        currentStep: 2,
      })

      nextStep()
    } catch (err: any) {
      setError(err.message || 'Error al procesar la solicitud. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <GlobeAltIcon className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
          Introduce la web de tu negocio
        </h1>
        <p className="text-text-secondary">
          Analizaremos tu sitio web para configurar tu agente AI automáticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Website URL */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-text-primary mb-2">
            URL del sitio web
          </label>
          <input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://mi-negocio.es"
            className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg
                       text-white placeholder-text-muted
                       focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30
                       transition-colors"
            disabled={loading}
          />
        </div>

        {/* Country code */}
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-text-primary mb-2">
            Código de país para el número de teléfono
          </label>
          <select
            id="country"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg
                       text-white
                       focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30
                       transition-colors"
            disabled={loading}
          >
            <option value="+34">+34 (España)</option>
            <option value="+52">+52 (México)</option>
            <option value="+54">+54 (Argentina)</option>
            <option value="+57">+57 (Colombia)</option>
            <option value="+56">+56 (Chile)</option>
          </select>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 bg-primary text-white font-medium rounded-lg
                     hover:bg-primary-600 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analizando tu web...
            </>
          ) : (
            'Continuar'
          )}
        </button>

        <p className="text-xs text-text-muted text-center">
          Analizaremos tu web para extraer información del negocio. Podrás editar los datos en el siguiente paso.
        </p>
      </form>
    </div>
  )
}
