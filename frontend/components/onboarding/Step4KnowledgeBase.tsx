'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useOnboarding } from '@/lib/onboarding-context'
import { api, KBStatus } from '@/lib/api'
import { DocumentTextIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

const ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const CATEGORIES = [
  { value: 'faq', label: 'Preguntas frecuentes' },
  { value: 'services', label: 'Servicios y precios' },
  { value: 'policies', label: 'Políticas y condiciones' },
  { value: 'general', label: 'Información general' },
]

type UploadMode = 'files' | 'text'

export default function Step4KnowledgeBase() {
  const { state, nextStep } = useOnboarding()
  const [mode, setMode] = useState<UploadMode>('files')
  const [files, setFiles] = useState<File[]>([])
  const [manualText, setManualText] = useState('')
  const [category, setCategory] = useState('general')
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [kbStatus, setKbStatus] = useState<KBStatus | null>(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles).filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type) && !f.name.endsWith('.txt') && !f.name.endsWith('.pdf')) {
        return false
      }
      if (f.size > 10 * 1024 * 1024) return false // 10MB max
      return true
    })

    if (valid.length < newFiles.length) {
      setError('Algunos archivos no son válidos. Acepta: PDF, TXT, DOC/DOCX (máx 10MB)')
    }

    setFiles((prev) => [...prev, ...valid])
  }, [])

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const pollStatus = useCallback(async () => {
    if (!mountedRef.current) return
    try {
      const status = await api.getKBStatus(state.customerId!)
      if (!mountedRef.current) return
      setKbStatus(status)

      if (status.status === 'complete') {
        setProcessing(false)
        return
      }

      if (status.status === 'error') {
        setProcessing(false)
        setError('Error al procesar la base de conocimiento. Inténtalo de nuevo.')
        return
      }

      // Keep polling
      pollRef.current = setTimeout(pollStatus, 3000)
    } catch {
      if (mountedRef.current) {
        pollRef.current = setTimeout(pollStatus, 5000)
      }
    }
  }, [state.customerId])

  const handleUploadFiles = async () => {
    if (files.length === 0) {
      setError('Selecciona al menos un archivo')
      return
    }

    setUploading(true)
    setError('')

    try {
      await api.uploadKnowledgeBase(state.customerId!, files)
      setUploading(false)
      setProcessing(true)
      pollStatus()
    } catch (err: any) {
      setError(err.message || 'Error al subir los archivos')
      setUploading(false)
    }
  }

  const handleSubmitText = async () => {
    if (!manualText.trim()) {
      setError('Escribe o pega el contenido de tu base de conocimiento')
      return
    }

    setUploading(true)
    setError('')

    try {
      await api.submitKnowledgeText(state.customerId!, manualText, category)
      setUploading(false)
      setProcessing(true)
      pollStatus()
    } catch (err: any) {
      setError(err.message || 'Error al enviar el texto')
      setUploading(false)
    }
  }

  const handleContinue = () => {
    nextStep()
  }

  // Processing view
  if (processing || (kbStatus && kbStatus.status === 'complete')) {
    const progress = kbStatus?.progress ?? 0
    const isComplete = kbStatus?.status === 'complete'

    return (
      <div className="animate-fade-in text-center py-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          {isComplete ? (
            <CheckCircleIcon className="w-7 h-7 text-green-400" />
          ) : (
            <DocumentTextIcon className="w-7 h-7 text-primary" />
          )}
        </div>

        <h2 className="text-xl font-heading font-bold text-white mb-2">
          {isComplete ? '¡Base de conocimiento lista!' : 'Procesando documentos...'}
        </h2>
        <p className="text-text-secondary mb-6">
          {isComplete
            ? `Se procesaron ${kbStatus?.processed_sources ?? 0} fuente(s) correctamente.`
            : 'Estamos analizando y estructurando la información de tu negocio.'}
        </p>

        {/* Progress bar */}
        <div className="w-full max-w-md mx-auto mb-6">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>
              {kbStatus?.processed_sources ?? 0} / {kbStatus?.total_sources ?? 0} fuentes
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-dark-light rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {isComplete && (
          <button
            onClick={handleContinue}
            className="w-full max-w-md mx-auto py-3 px-6 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
          >
            Continuar
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <DocumentTextIcon className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">
          Base de conocimiento
        </h1>
        <p className="text-text-secondary">
          Sube documentos o escribe información para que tu agente pueda responder preguntas.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg bg-dark-lighter p-1 mb-6">
        <button
          type="button"
          onClick={() => setMode('files')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === 'files'
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          Subir archivos
        </button>
        <button
          type="button"
          onClick={() => setMode('text')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === 'text'
              ? 'bg-primary text-white'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          Escribir texto
        </button>
      </div>

      {mode === 'files' ? (
        <>
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
              ${dragOver
                ? 'border-primary bg-primary/5'
                : 'border-white/10 bg-dark-lighter hover:border-white/20'}
            `}
          >
            <ArrowUpTrayIcon className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-white font-medium mb-1">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-text-muted text-sm">
              PDF, TXT, DOC, DOCX — máximo 10MB por archivo
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx"
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between p-3 bg-dark-lighter rounded-lg border border-white/5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <DocumentTextIcon className="w-5 h-5 text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{file.name}</p>
                      <p className="text-text-muted text-xs">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="p-1 hover:bg-white/5 rounded transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUploadFiles}
            disabled={files.length === 0 || uploading}
            className="w-full mt-6 py-3 px-6 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Subiendo...
              </>
            ) : (
              `Subir ${files.length} archivo${files.length !== 1 ? 's' : ''}`
            )}
          </button>
        </>
      ) : (
        <>
          {/* Category select */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary/50 transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Text area */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Contenido
            </label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={8}
              placeholder={
                'Escribe o pega aquí la información de tu negocio.\n\nPor ejemplo:\n- Preguntas frecuentes y respuestas\n- Lista de servicios con precios\n- Políticas de cancelación\n- Horarios especiales'
              }
              className="w-full px-4 py-3 bg-dark-lighter border border-white/10 rounded-lg text-white placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-text-muted">
              {manualText.length} caracteres
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmitText}
            disabled={!manualText.trim() || uploading}
            className="w-full mt-6 py-3 px-6 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Enviando...
              </>
            ) : (
              'Enviar y procesar'
            )}
          </button>
        </>
      )}

      <p className="mt-4 text-xs text-text-muted text-center">
        La información se procesará con IA para estructurar las respuestas de tu agente.
      </p>
    </div>
  )
}
