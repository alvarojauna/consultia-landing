'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { api, DashboardOverview } from '@/lib/api'
import {
  PhoneIcon,
  ClockIcon,
  CurrencyEuroIcon,
  SignalIcon,
} from '@heroicons/react/24/outline'

export default function DashboardOverviewClient() {
  const { customerId } = useParams<{ customerId: string }>()
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await api.getDashboardOverview(customerId)
        setData(result)
      } catch (err: any) {
        setError(err.message || 'Error al cargar el dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [customerId])

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        {error || 'Error desconocido'}
      </div>
    )
  }

  const stats = [
    {
      label: 'Llamadas este periodo',
      value: data.usage.total_calls,
      icon: PhoneIcon,
      color: 'text-blue-400',
    },
    {
      label: 'Minutos usados',
      value: `${data.usage.total_minutes.toFixed(1)} / ${data.subscription?.minutes_included ?? 0}`,
      icon: ClockIcon,
      color: 'text-green-400',
    },
    {
      label: 'Coste extra',
      value: `${data.usage.total_cost.toFixed(2)}€`,
      icon: CurrencyEuroIcon,
      color: 'text-yellow-400',
    },
    {
      label: 'Llamadas (7 días)',
      value: data.recent_calls_7d,
      icon: SignalIcon,
      color: 'text-purple-400',
    },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">
          {data.customer.business_name}
        </h1>
        <p className="text-text-secondary mt-1">
          Panel de control de tu agente AI
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-4 bg-dark-lighter rounded-xl border border-white/5"
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-xs text-text-muted">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Usage bar */}
      {data.subscription && (
        <div className="p-5 bg-dark-lighter rounded-xl border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white">Uso de minutos</h3>
            <span className="text-xs text-text-muted">
              {data.usage.usage_percentage.toFixed(0)}% usado
            </span>
          </div>
          <div className="h-3 bg-dark-light rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                data.usage.usage_percentage > 90 ? 'bg-red-500' :
                data.usage.usage_percentage > 70 ? 'bg-yellow-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, data.usage.usage_percentage)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-text-muted">
            <span>{data.usage.total_minutes.toFixed(1)} min usados</span>
            <span>{data.usage.minutes_remaining.toFixed(0)} min restantes</span>
          </div>
        </div>
      )}

      {/* Agent & Phone card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 bg-dark-lighter rounded-xl border border-white/5">
          <h3 className="text-sm font-medium text-text-muted mb-3">Agente</h3>
          {data.agent ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{data.agent.agent_name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    data.agent.status === 'active'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}
                >
                  {data.agent.status === 'active' ? 'Activo' : 'Pausado'}
                </span>
              </div>
              <p className="text-sm text-text-secondary">Voz: {data.agent.voice_name}</p>
            </div>
          ) : (
            <p className="text-text-muted text-sm">No hay agente configurado</p>
          )}
        </div>

        <div className="p-5 bg-dark-lighter rounded-xl border border-white/5">
          <h3 className="text-sm font-medium text-text-muted mb-3">Teléfono</h3>
          {data.phone_number ? (
            <div>
              <p className="text-white font-medium text-lg">{data.phone_number.number}</p>
              <p className="text-sm text-text-secondary">País: {data.phone_number.country_code}</p>
            </div>
          ) : (
            <p className="text-text-muted text-sm">Sin número asignado</p>
          )}
        </div>
      </div>

      {/* Subscription info */}
      {data.subscription && (
        <div className="p-5 bg-dark-lighter rounded-xl border border-white/5">
          <h3 className="text-sm font-medium text-text-muted mb-3">Suscripción</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Plan</span>
              <p className="text-white font-medium capitalize mt-0.5">{data.subscription.plan_tier}</p>
            </div>
            <div>
              <span className="text-text-muted">Precio</span>
              <p className="text-white font-medium mt-0.5">{data.subscription.price_eur}€/mes</p>
            </div>
            <div>
              <span className="text-text-muted">Estado</span>
              <p className="text-white font-medium capitalize mt-0.5">{data.subscription.status}</p>
            </div>
            <div>
              <span className="text-text-muted">Período</span>
              <p className="text-white font-medium capitalize mt-0.5">{data.subscription.billing_period}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
