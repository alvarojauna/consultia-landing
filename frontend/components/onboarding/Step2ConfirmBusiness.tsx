'use client'

import { useState, useEffect } from 'react'
import { useOnboarding } from '@/lib/onboarding-context'
import { api, ScrapedBusinessData } from '@/lib/api'
import { BuildingOfficeIcon } from '@heroicons/react/24/outline'

export default function Step2ConfirmBusiness() {
  const { state, updateState, nextStep } = useOnboarding()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [scraperError, setScraperError] = useState(false)

  // Form fields
  const [businessName, setBusinessName] = useState(state.businessName || '')
  const [address, setAddress] = useState(state.businessAddress || '')
  const [phone, setPhone] = useState(state.businessPhone || '')
  const [industry, setIndustry] = useState(state.industry || '')
  const [services, setServices] = useState(state.services?.join(', ') || '')
  const [hours, setHours] = useState('')

  // Poll for scraping results with proper cleanup
  useEffect(() => {
    if (!state.customerId) return

    let attempts = 0
    const maxAttempts = 30 // 30 * 2s = 60s max wait
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const poll = async () => {
      if (cancelled) return

      try {
        const result = await api.getBusinessStatus(state.customerId!)

        if (cancelled) return

        if (result.status === 'complete' && result.scraped_data) {
          const data = result.scraped_data
          if (data.error) {
            setScraperError(true)
            setLoading(false)
            return
          }
          setBusinessName(data.business_name || '')
          setAddress(data.address || '')
          setPhone(data.phone || '')
          setIndustry(data.industry || '')
          setServices((data.services || []).join(', '))
          if (data.hours) {
            setHours(Object.entries(data.hours).map(([k, v]) => `${k}: ${v}`).join('\n'))
          }
          setLoading(false)
          return
        }

        attempts++
        if (attempts >= maxAttempts) {
          setScraperError(true)
          setLoading(false)
          return
        }

        timeoutId = setTimeout(poll, 2000)
      } catch {
        if (cancelled) return
        attempts++
        if (attempts >= maxAttempts) {
          setScraperError(true)
          setLoading(false)
          return
        }
        timeoutId = setTimeout(poll, 2000)
      }
    }

    poll()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [state.customerId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!businessName.trim()) {
      setError('El nombre del negocio es obligatorio')
      return
    }

    setSaving(true)

    try {
      const servicesArray = services.split(',').map((s) => s.trim()).filter(Boolean)
      const hoursObj: Record<string, string> = {}
      hours.split('\n').forEach((line) => {
        const [key, val] = line.split(':').map((s) => s.trim())
        if (key && val) hoursObj[key] = val
      })

      await api.confirmBusiness(state.customerId!, {
        business_name: businessName,
        business_address: address,
        business_phone: phone,
        industry,
        services: servicesArray,
        hours: hoursObj,
      })

      updateState({
        businessName,
        businessAddress: address,
        businessPhone: phone,
        industry,
        services: servicesArray,
        hours: hoursObj,
      })

      nextStep()
    } catch (err: any) {
      setError(err.message || 'Error al guardar los datos')
    } finally {
      setSaving(false)
    }
  }

  // Loading state while scraper works
  if (loading) {
    return (
      <div className="animate-fade-in text-center py-12">
        <svg className="animate-spin h-10 w-10 text-primary mx-auto mb-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <h2 className="text-xl font-heading font-bold text-white mb-2">
          Analizando tu web...
        </h2>
        <p className="text-text-secondary">
          Estamos extrayendo información de {state.website}
        </p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <BuildingOfficeIcon className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
          Confirma los datos de tu negocio
        </h1>
        <p className="text-text-secondary">
          {scraperError
            ? 'No pudimos extraer los datos automáticamente. Rellena la información manualmente.'
            : 'Hemos extraído esta información de tu web. Edita lo que necesites.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Nombre del negocio *
          </label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Clínica Veterinaria San Sebastián"
            className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Dirección
          </label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Calle Mayor 123, 48001 Bilbao"
            className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Teléfono
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 944 123 456"
              className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Industria
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50 transition-colors"
            >
              <option value="">Seleccionar...</option>
              <option value="veterinary">Veterinaria</option>
              <option value="dental">Clínica Dental</option>
              <option value="medical">Clínica Médica</option>
              <option value="hair_salon">Peluquería</option>
              <option value="auto_repair">Taller Mecánico</option>
              <option value="restaurant">Restaurante</option>
              <option value="law_firm">Despacho Abogados</option>
              <option value="real_estate">Inmobiliaria</option>
              <option value="construction">Construcción</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Servicios (separados por comas)
          </label>
          <textarea
            value={services}
            onChange={(e) => setServices(e.target.value)}
            rows={2}
            placeholder="Consultas, Vacunación, Cirugía, Urgencias 24h"
            className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Horarios (uno por línea, formato: día: hora)
          </label>
          <textarea
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            rows={3}
            placeholder={"Lunes-Viernes: 09:00-20:00\nSábado: 10:00-14:00\nDomingo: Cerrado"}
            className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 px-6 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </>
          ) : (
            'Confirmar y continuar'
          )}
        </button>
      </form>
    </div>
  )
}
