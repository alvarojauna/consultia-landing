'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { api, CallRecord } from '@/lib/api'
import { PhoneIcon, PlayIcon } from '@heroicons/react/24/outline'

export default function CallsClient() {
  const { customerId } = useParams<{ customerId: string }>()
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedCall, setExpandedCall] = useState<string | null>(null)

  const fetchCalls = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const result = await api.getCalls(customerId, { page: p, limit: 20 })
      setCalls(result.calls)
      setTotalPages(result.pagination.total_pages)
      setTotal(result.pagination.total)
    } catch (err: any) {
      setError(err.message || 'Error al cargar llamadas')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchCalls(page)
  }, [page, fetchCalls])

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Historial de llamadas</h1>
          <p className="text-text-secondary text-sm mt-1">{total} llamadas en total</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Calls table */}
      <div className="bg-dark-lighter rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Duración</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Coste</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wider">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <svg className="animate-spin h-6 w-6 text-primary mx-auto" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-text-muted">
                    No hay llamadas registradas
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <>
                    <tr
                      key={call.usage_id}
                      className="hover:bg-dark-light transition-colors cursor-pointer"
                      onClick={() =>
                        setExpandedCall(expandedCall === call.usage_id ? null : call.usage_id)
                      }
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PhoneIcon className="w-4 h-4 text-text-muted" />
                          <span className="text-white text-sm">
                            {new Date(call.recorded_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {call.duration_minutes.toFixed(1)} min
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={call.cost_eur > 0 ? 'text-yellow-400' : 'text-text-secondary'}>
                          {call.cost_eur > 0 ? `${call.cost_eur.toFixed(2)}€` : 'Incluido'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {call.transcript ? 'Con transcripción' : call.recording_url ? 'Con grabación' : '—'}
                      </td>
                    </tr>
                    {expandedCall === call.usage_id && (call.transcript || call.recording_url) && (
                      <tr key={`${call.usage_id}-detail`}>
                        <td colSpan={4} className="px-4 py-3 bg-dark">
                          {call.recording_url && (
                            <div className="mb-3">
                              <span className="text-xs text-text-muted block mb-1">Grabación</span>
                              <audio controls src={call.recording_url} className="w-full max-w-md" />
                            </div>
                          )}
                          {call.transcript && (
                            <div>
                              <span className="text-xs text-text-muted block mb-1">Transcripción</span>
                              <div className="p-3 bg-dark-lighter rounded-lg text-sm text-text-secondary max-h-40 overflow-y-auto whitespace-pre-wrap">
                                {call.transcript}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm text-text-muted">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
