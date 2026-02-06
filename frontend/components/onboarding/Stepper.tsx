'use client'

import { CheckIcon } from '@heroicons/react/24/solid'

const steps = [
  { number: 1, label: 'Tu negocio' },
  { number: 2, label: 'Confirmar' },
  { number: 3, label: 'Voz' },
  { number: 4, label: 'Conocimiento' },
  { number: 5, label: 'Probar' },
  { number: 6, label: 'Pago' },
]

interface StepperProps {
  currentStep: number
  onStepClick?: (step: number) => void
}

export default function Stepper({ currentStep, onStepClick }: StepperProps) {
  return (
    <nav className="w-full max-w-3xl mx-auto px-4 py-6">
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number
          const isCurrent = currentStep === step.number
          const isClickable = onStepClick && step.number < currentStep

          return (
            <li
              key={step.number}
              className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
            >
              {/* Step circle */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.number)}
                disabled={!isClickable}
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  transition-all duration-200 shrink-0
                  ${isCompleted
                    ? 'bg-primary text-white cursor-pointer hover:bg-primary-600'
                    : isCurrent
                      ? 'bg-primary text-white ring-2 ring-primary/30 ring-offset-2 ring-offset-dark'
                      : 'bg-dark-light text-text-muted'
                  }
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                {isCompleted ? (
                  <CheckIcon className="w-4 h-4" />
                ) : (
                  step.number
                )}
              </button>

              {/* Step label (hidden on mobile for all but current) */}
              <span
                className={`
                  ml-2 text-xs whitespace-nowrap
                  ${isCurrent ? 'text-white font-medium' : 'text-text-muted hidden sm:inline'}
                  ${isCompleted ? 'sm:inline' : ''}
                `}
              >
                {step.label}
              </span>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    flex-1 h-px mx-3
                    ${isCompleted ? 'bg-primary' : 'bg-dark-light'}
                  `}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
