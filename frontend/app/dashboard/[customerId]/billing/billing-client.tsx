'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { api, BillingData } from '@/lib/api'
import { CreditCardIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

export default function BillingClient() {
  const { customerId } = useParams<{ customerId: string }>()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await api.getBilling(customerId)
        setData(result)
      } catch (err: any) {
        setError(err.message || 'Error al cargar facturación')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [customerId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
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

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Facturación</h1>
        <p className="text-text-secondary text-sm mt-1">
          Gestiona tu suscripción y consulta facturas
        </p>
      </div>

      {/* Subscription card */}
      <div className="p-5 bg-dark-lighter rounded-xl border border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Plan actual</h3>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              data.subscription.status === 'active'
                ? 'bg-green-500/10 text-green-400'
                : data.subscription.status === 'trialing'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-yellow-500/10 text-yellow-400'
            }`}
          >
            {data.subscription.status === 'active'
              ? 'Activo'
              : data.subscription.status === 'trialing'
                ? 'Prueba'
                : data.subscription.status}
          </span>
        </div>
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
            <span className="text-text-muted">Minutos incluidos</span>
            <p className="text-white font-medium mt-0.5">{data.subscription.minutes_included}</p>
          </div>
          <div>
            <span className="text-text-muted">Facturación</span>
            <p className="text-white font-medium capitalize mt-0.5">{data.subscription.billing_period}</p>
          </div>
        </div>
      </div>

      {/* Usage breakdown */}
      <div className="p-5 bg-dark-lighter rounded-xl border border-white/5">
        <h3 className="text-white font-medium mb-4">Uso del período actual</h3>

        <div className="mb-4">
          <div className="flex justify-between mb-1.5 text-sm">
            <span className="text-text-secondary">
              {data.usage.total_minutes.toFixed(1)} / {data.usage.minutes_included} minutos
            </span>
            <span className="text-text-muted">{data.usage.usage_percentage.toFixed(0)}%</span>
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
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Llamadas</span>
            <p className="text-white font-medium mt-0.5">{data.usage.total_calls}</p>
          </div>
          <div>
            <span className="text-text-muted">Min. restantes</span>
            <p className="text-white font-medium mt-0.5">{data.usage.minutes_remaining.toFixed(0)}</p>
          </div>
          <div>
            <span className="text-text-muted">Excedente</span>
            <p className={`font-medium mt-0.5 ${data.usage.overage_minutes > 0 ? 'text-yellow-400' : 'text-white'}`}>
              {data.usage.overage_minutes.toFixed(1)} min
            </p>
          </div>
          <div>
            <span className="text-text-muted">Coste extra</span>
            <p className={`font-medium mt-0.5 ${data.usage.overage_cost_eur > 0 ? 'text-yellow-400' : 'text-white'}`}>
              {data.usage.overage_cost_eur.toFixed(2)}€
            </p>
          </div>
        </div>
      </div>

      {/* Daily usage chart (simple bar representation) */}
      {data.daily_usage.length > 0 && (
        <div className="p-5 bg-dark-lighter rounded-xl border border-white/5">
          <h3 className="text-white font-medium mb-4">Uso diario (últimos 30 días)</h3>
          <div className="flex items-end gap-1 h-32">
            {data.daily_usage.map((day) => {
              const maxMinutes = Math.max(...data.daily_usage.map((d) => d.minutes), 1)
              const height = (day.minutes / maxMinutes) * 100

              return (
                <div
                  key={day.date}
                  className="flex-1 group relative"
                  title={`${day.date}: ${day.minutes.toFixed(1)} min, ${day.calls} llamadas`}
                >
                  <div
                    className="bg-primary/60 hover:bg-primary rounded-t transition-colors"
                    style={{ height: `${Math.max(2, height)}%` }}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-text-muted">
            <span>{data.daily_usage[0]?.date}</span>
            <span>{data.daily_usage[data.daily_usage.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Invoices */}
      <div className="bg-dark-lighter rounded-xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-white font-medium">Facturas</h3>
        </div>

        {data.invoices.length === 0 ? (
          <div className="px-5 py-8 text-center text-text-muted text-sm">
            No hay facturas disponibles
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.invoices.map((invoice) => (
              <div
                key={invoice.invoice_id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <CreditCardIcon className="w-5 h-5 text-text-muted" />
                  <div>
                    <p className="text-white text-sm">{invoice.number || invoice.invoice_id}</p>
                    <p className="text-text-muted text-xs">
                      {new Date(invoice.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-sm font-medium ${
                      invoice.status === 'paid' ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {invoice.amount_eur.toFixed(2)}€
                  </span>
                  {invoice.invoice_url && (
                    <a
                      href={invoice.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-white/5 rounded transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 text-text-muted" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
