'use client'

import { motion } from 'framer-motion'
import { CheckIcon } from '@heroicons/react/24/solid'

const plans = [
  {
    name: 'Starter',
    price: '29',
    description: 'Perfecto para autónomos',
    features: [
      '100 minutos incluidos',
      '1 número +34',
      'Transcripciones ilimitadas',
      'Integración calendario',
      'Soporte email',
    ],
    cta: 'Empezar ahora',
    popular: false,
  },
  {
    name: 'Profesional',
    price: '79',
    description: 'Para negocios en crecimiento',
    features: [
      '300 minutos incluidos',
      '1 número +34',
      'Todo de Starter +',
      'Voces premium',
      'Integración CRM',
      'Soporte prioritario',
    ],
    cta: 'Empezar ahora',
    popular: true,
  },
  {
    name: 'Empresa',
    price: '199',
    description: 'Para equipos grandes',
    features: [
      'Minutos ilimitados*',
      'Hasta 3 números +34',
      'Todo de Profesional +',
      'API access',
      'White-label',
      'Account manager',
    ],
    cta: 'Empezar ahora',
    popular: false,
  },
]

export default function Pricing() {
  return (
    <section className="py-24 bg-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-4"
        >
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-white mb-6">
            Empieza sin riesgo.
          </h2>
          <p className="text-xl text-primary font-semibold mb-12">
            30 días de garantía.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                plan.popular
                  ? 'bg-primary/10 border-2 border-primary shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30'
                  : 'bg-dark-lighter border border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/5'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                    ⭐ Más popular
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-2xl font-heading font-bold text-white mb-2">
                {plan.name}
              </h3>

              {/* Description */}
              <p className="text-text-secondary mb-6">{plan.description}</p>

              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline">
                  <span className="text-5xl font-heading font-bold text-white">
                    {plan.price}€
                  </span>
                  <span className="text-text-secondary ml-2">/mes</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary flex-shrink-0 mr-3 mt-0.5" />
                    <span className="text-text-primary text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                className={`w-full py-3 rounded-full font-medium transition-all ${
                  plan.popular
                    ? 'bg-primary hover:bg-primary-600 text-white shadow-lg shadow-primary/50 hover:shadow-xl hover:shadow-primary/60'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-white/20'
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer Note */}
        <div className="text-center mt-12">
          <p className="text-sm text-text-secondary">
            *Fair use ~1000 min. Minutos extra: 0.15€/min. • 30 días sin compromiso. Cancela cuando quieras.
          </p>
        </div>
      </div>
    </section>
  )
}
