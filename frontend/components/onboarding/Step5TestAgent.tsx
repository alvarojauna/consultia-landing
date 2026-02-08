'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useOnboarding } from '@/lib/onboarding-context'
import { api, DeployStatus, TestCallStatus } from '@/lib/api'
import { PhoneIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

type Phase = 'deploying' | 'ready' | 'calling' | 'call-complete'

export default function Step5TestAgent() {
  const { state, updateState, nextStep } = useOnboarding()
  const [phase, setPhase] = useState<Phase>('deploying')
  const [deployStatus, setDeployStatus] = useState<DeployStatus | null>(null)
  const [testPhone, setTestPhone] = useState('')
  const [callStatus, setCallStatus] = useState<TestCallStatus | null>(null)
  const [callSid, setCallSid] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [initiatingCall, setInitiatingCall] = useState(false)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

  // Start deployment on mount
  useEffect(() => {
    let cancelled = false

    const deploy = async () => {
      try {
        const result = await api.deployAgent(state.customerId!)
        if (cancelled) return
        updateState({ agentId: result.agent_id })
        pollDeployStatus()
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Error al desplegar el agente')
        }
      }
    }

    deploy()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pollDeployStatus = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      const status = await api.getDeployStatus(state.customerId!)
      if (!mountedRef.current) return
      setDeployStatus(status)

      // Check if deployment is complete (backend uses 'active' status)
      if (status.status === 'complete' || status.status === 'active') {
        updateState({
          agentId: status.agent_id || state.agentId,
          phoneNumber: status.phone_number || null,
        })
        setPhase('ready')
        return
      }

      if (status.status === 'error') {
        setError('Error al desplegar el agente. Inténtalo de nuevo.')
        return
      }

      pollRef.current = setTimeout(pollDeployStatus, 3000)
    } catch {
      if (mountedRef.current) {
        pollRef.current = setTimeout(pollDeployStatus, 5000)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.customerId])

  const handleTestCall = async () => {
    if (!testPhone.trim()) {
      setError('Introduce un número de teléfono para la llamada de prueba')
      return
    }

    setInitiatingCall(true)
    setError('')

    try {
      const result = await api.testCall(state.customerId!, testPhone)
      setCallSid(result.call_sid)
      setPhase('calling')
      pollCallStatus(result.call_sid)
    } catch (err: any) {
      setError(err.message || 'Error al iniciar la llamada de prueba')
    } finally {
      setInitiatingCall(false)
    }
  }

  const pollCallStatus = useCallback(
    async (sid: string) => {
      if (!mountedRef.current) return
      try {
        const status = await api.getTestCallStatus(state.customerId!, sid)
        if (!mountedRef.current) return
        setCallStatus(status)

        if (status.status === 'completed' || status.status === 'failed' || status.status === 'no-answer') {
          setPhase('call-complete')
          return
        }

        pollRef.current = setTimeout(() => pollCallStatus(sid), 2000)
      } catch {
        if (mountedRef.current) {
          pollRef.current = setTimeout(() => pollCallStatus(sid), 4000)
        }
      }
    },
    [state.customerId]
  )

  const deployStepLabel = (status: DeployStatus | null) => {
    switch (status?.status) {
      case 'creating_agent':
        return 'Creando agente en ElevenLabs...'
      case 'provisioning_number':
        return 'Asignando número de teléfono...'
      case 'linking':
        return 'Conectando agente al número...'
      case 'deploying':
        // Check if ElevenLabs agent was created to show more specific progress
        if (status?.elevenlabs_agent_id) {
          return status?.phone_number
            ? 'Finalizando configuración...'
            : 'Asignando número de teléfono...'
        }
        return 'Creando agente en ElevenLabs...'
      case 'complete':
      case 'active':
        return '¡Agente desplegado!'
      default:
        return 'Iniciando despliegue...'
    }
  }

  // Deploying phase
  if (phase === 'deploying') {
    return (
      <div className="animate-fade-in text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <RocketLaunchIcon className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-heading font-bold text-white mb-2">
          Desplegando tu agente
        </h2>
        <p className="text-text-secondary mb-6">
          {deployStepLabel(deployStatus)}
        </p>

        {!error && (
          <svg className="animate-spin h-8 w-8 text-primary mx-auto" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm max-w-md mx-auto">
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-500/10 mb-4">
          <CheckCircleIcon className="w-7 h-7 text-green-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
          ¡Tu agente está listo!
        </h1>
        <p className="text-text-secondary">
          Prueba tu agente con una llamada real antes de activarlo.
        </p>
      </div>

      {/* Agent info card */}
      <div className="p-4 bg-dark-lighter rounded-xl border border-white/10 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Agente</span>
            <p className="text-white font-medium mt-0.5">
              {deployStatus?.agent_name || state.businessName}
            </p>
          </div>
          <div>
            <span className="text-text-muted">Teléfono asignado</span>
            <p className="text-white font-medium mt-0.5">
              {state.phoneNumber || 'Asignando...'}
            </p>
          </div>
          {deployStatus?.docs_processed != null && (
            <div>
              <span className="text-text-muted">Documentos procesados</span>
              <p className="text-white font-medium mt-0.5">{deployStatus.docs_processed}</p>
            </div>
          )}
          {deployStatus?.faqs_extracted != null && (
            <div>
              <span className="text-text-muted">FAQs extraídas</span>
              <p className="text-white font-medium mt-0.5">{deployStatus.faqs_extracted}</p>
            </div>
          )}
        </div>
      </div>

      {/* Test call section */}
      {phase === 'ready' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Tu número de teléfono (para recibir la llamada de prueba)
            </label>
            <div className="flex gap-3">
              <input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder={`${state.countryCode} 612 345 678`}
                className="flex-1 px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button
                onClick={handleTestCall}
                disabled={!testPhone.trim() || initiatingCall}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
              >
                {initiatingCall ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <PhoneIcon className="w-5 h-5" />
                )}
                Llamar
              </button>
            </div>
          </div>

          <button
            onClick={() => nextStep()}
            className="w-full py-3 px-6 bg-dark-lighter text-text-secondary font-medium rounded-lg hover:bg-dark-light hover:text-white transition-colors border border-white/10"
          >
            Saltar prueba y continuar
          </button>
        </div>
      )}

      {/* Calling in progress */}
      {phase === 'calling' && (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-green-500/10 border border-green-500/20 rounded-xl mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <span className="text-green-400 font-medium">Llamada en curso...</span>
          </div>
          <p className="text-text-secondary text-sm">
            Contesta el teléfono y habla con tu agente. La llamada se registrará.
          </p>
        </div>
      )}

      {/* Call complete */}
      {phase === 'call-complete' && callStatus && (
        <div className="space-y-4">
          <div className="p-4 bg-dark-lighter rounded-xl border border-white/10">
            <h3 className="text-white font-medium mb-3">Resultado de la llamada</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-text-muted">Estado</span>
                <p className="text-white mt-0.5">
                  {callStatus.status === 'completed' ? 'Completada' : 'No contestada'}
                </p>
              </div>
              {callStatus.duration_seconds != null && (
                <div>
                  <span className="text-text-muted">Duración</span>
                  <p className="text-white mt-0.5">{callStatus.duration_seconds}s</p>
                </div>
              )}
            </div>

            {callStatus.transcript && (
              <div className="mt-4">
                <span className="text-text-muted text-sm">Transcripción</span>
                <div className="mt-1 p-3 bg-dark rounded-lg text-sm text-text-secondary max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {callStatus.transcript}
                </div>
              </div>
            )}

            {callStatus.recording_url && (
              <div className="mt-3">
                <audio controls src={callStatus.recording_url} className="w-full" />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setPhase('ready')
                setCallStatus(null)
                setCallSid(null)
                setTestPhone('')
              }}
              className="flex-1 py-3 px-6 bg-dark-lighter text-text-secondary font-medium rounded-lg hover:bg-dark-light hover:text-white transition-colors border border-white/10"
            >
              Otra prueba
            </button>
            <button
              onClick={() => nextStep()}
              className="flex-1 py-3 px-6 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              Continuar al pago
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
