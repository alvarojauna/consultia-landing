'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { api, AgentSettings } from '@/lib/api'
import { CogIcon, PauseIcon, PlayIcon } from '@heroicons/react/24/outline'

export default function AgentSettingsClient() {
  const { customerId } = useParams<{ customerId: string }>()
  const [agent, setAgent] = useState<AgentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Editable fields
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await api.getAgentSettings(customerId)
        setAgent(result)
        setName(result.agent_name)
        setPrompt(result.system_prompt)
      } catch (err: any) {
        setError(err.message || 'Error al cargar configuración')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [customerId])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await api.updateAgentSettings(customerId, {
        agent_name: name,
        system_prompt: prompt,
      })
      setSuccess('Configuración guardada correctamente')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async () => {
    if (!agent) return
    setToggling(true)
    setError('')
    try {
      if (agent.status === 'active') {
        await api.pauseAgent(customerId)
        setAgent({ ...agent, status: 'inactive' })
      } else {
        await api.resumeAgent(customerId)
        setAgent({ ...agent, status: 'active' })
      }
    } catch (err: any) {
      setError(err.message || 'Error al cambiar estado')
    } finally {
      setToggling(false)
    }
  }

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

  if (!agent) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        {error || 'Agente no encontrado'}
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Configuración del agente</h1>
          <p className="text-text-secondary text-sm mt-1">
            Personaliza el comportamiento de tu agente AI
          </p>
        </div>

        {/* Pause/Resume toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            agent.status === 'active'
              ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
          }`}
        >
          {toggling ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : agent.status === 'active' ? (
            <PauseIcon className="w-4 h-4" />
          ) : (
            <PlayIcon className="w-4 h-4" />
          )}
          {agent.status === 'active' ? 'Pausar agente' : 'Reactivar agente'}
        </button>
      </div>

      {/* Status badge */}
      <div className="p-4 bg-dark-lighter rounded-xl border border-white/5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Estado</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  agent.status === 'active' ? 'bg-green-400' : 'bg-yellow-400'
                }`}
              />
              <span className="text-white capitalize">{agent.status === 'active' ? 'Activo' : 'Pausado'}</span>
            </div>
          </div>
          <div>
            <span className="text-text-muted">Voz</span>
            <p className="text-white mt-0.5">{agent.voice_name}</p>
          </div>
          <div>
            <span className="text-text-muted">Desplegado</span>
            <p className="text-white mt-0.5">
              {agent.deployed_at
                ? new Date(agent.deployed_at).toLocaleDateString('es-ES')
                : '—'}
            </p>
          </div>
          {agent.knowledge_base && (
            <div>
              <span className="text-text-muted">Conocimiento</span>
              <p className="text-white mt-0.5">
                {agent.knowledge_base.services_count} servicios, {agent.knowledge_base.faqs_count} FAQs
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Editable fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Nombre del agente
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Instrucciones del sistema (prompt)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />
          <p className="mt-1 text-xs text-text-muted">
            {prompt.length} caracteres
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          'Guardar cambios'
        )}
      </button>
    </div>
  )
}
