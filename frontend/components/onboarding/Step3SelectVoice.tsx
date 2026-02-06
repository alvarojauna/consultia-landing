'use client'

import { useState, useEffect, useRef } from 'react'
import { useOnboarding } from '@/lib/onboarding-context'
import { api, Voice } from '@/lib/api'
import { SpeakerWaveIcon, PlayIcon, StopIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

export default function Step3SelectVoice() {
  const { state, updateState, nextStep } = useOnboarding()
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState(state.voiceId || '')
  const [selectedVoiceName, setSelectedVoiceName] = useState(state.voiceName || '')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const result = await api.getVoices()
        setVoices(result)
      } catch (err: any) {
        setError('Error al cargar las voces. Inténtalo de nuevo.')
      } finally {
        setLoading(false)
      }
    }

    fetchVoices()

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const togglePreview = (voice: Voice) => {
    if (playingVoice === voice.voice_id) {
      audioRef.current?.pause()
      setPlayingVoice(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    if (voice.preview_url) {
      const audio = new Audio(voice.preview_url)
      audio.onended = () => setPlayingVoice(null)
      audio.play()
      audioRef.current = audio
      setPlayingVoice(voice.voice_id)
    }
  }

  const handleSelect = (voice: Voice) => {
    setSelectedVoice(voice.voice_id)
    setSelectedVoiceName(voice.name)
  }

  const handleSubmit = async () => {
    if (!selectedVoice) {
      setError('Selecciona una voz para tu agente')
      return
    }

    setSaving(true)
    setError('')

    try {
      await api.selectVoice(state.customerId!, selectedVoice, selectedVoiceName)

      updateState({
        voiceId: selectedVoice,
        voiceName: selectedVoiceName,
      })

      nextStep()
    } catch (err: any) {
      setError(err.message || 'Error al seleccionar la voz')
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
        <p className="text-text-secondary">Cargando voces disponibles...</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <SpeakerWaveIcon className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
          Elige la voz de tu agente
        </h1>
        <p className="text-text-secondary">
          Escucha las opciones y selecciona la voz que mejor represente a tu negocio.
        </p>
      </div>

      {/* Voice grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {voices.map((voice) => {
          const isSelected = selectedVoice === voice.voice_id
          const isPlaying = playingVoice === voice.voice_id

          return (
            <button
              key={voice.voice_id}
              type="button"
              onClick={() => handleSelect(voice)}
              className={`
                relative p-4 rounded-xl border text-left transition-all duration-200
                ${isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-white/10 bg-dark-lighter hover:border-white/20 hover:bg-dark-light'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{voice.name}</span>
                    {isSelected && (
                      <CheckCircleIcon className="w-5 h-5 text-primary shrink-0" />
                    )}
                  </div>
                  {voice.description && (
                    <p className="text-sm text-text-secondary mt-0.5 truncate">
                      {voice.description}
                    </p>
                  )}
                </div>

                {/* Play/stop button */}
                {voice.preview_url && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      togglePreview(voice)
                    }}
                    className="ml-3 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors shrink-0"
                  >
                    {isPlaying ? (
                      <StopIcon className="w-4 h-4 text-primary" />
                    ) : (
                      <PlayIcon className="w-4 h-4 text-text-secondary" />
                    )}
                  </button>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selectedVoice || saving}
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
          'Continuar'
        )}
      </button>
    </div>
  )
}
