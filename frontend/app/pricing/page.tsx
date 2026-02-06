'use client'

import { useState } from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid'
import Link from 'next/link'

const plans = [
  {
    name: 'Starter',
    price: 29,
    yearlyPrice: 23,
    description: 'Perfecto para autónomos',
    features: [
      '150 minutos incluidos',
      '1 número +34',
      'Recepcionista AI entrenada en tu negocio',
      'Soporte 32 idiomas',
      'Integración con calendario',
      'Transcripciones de llamadas',
      'Resúmenes por SMS y email',
    ],
    cta: 'Empezar ahora',
    popular: false,
    available: true,
  },
  {
    name: 'Profesional',
    price: 79,
    yearlyPrice: 63,
    description: 'Para negocios en crecimiento',
    features: [
      '300 minutos incluidos',
      '1 número +34',
      'Todo de Starter, más:',
      'Voces premium personalizadas',
      'Integración nativa con CRM',
      'SMS y agentes de chat de Facebook',
      'Eliminar marca ConsultIA',
    ],
    cta: 'Próximamente',
    popular: true,
    available: false,
  },
  {
    name: 'Empresa',
    price: null,
    yearlyPrice: null,
    description: 'Despliegue e integraciones personalizadas',
    features: [
      'Minutos ilimitados*',
      'Hasta 3 números +34',
      'Todo de Profesional, más:',
      'Sistemas multi-agente',
      'Integración API personalizada',
      'Soporte multi-ubicación',
      'Cumplimiento RGPD + soporte dedicado',
    ],
    cta: 'Contactar ventas',
    popular: false,
    available: true,
  },
]

const features = [
  {
    category: 'Llamadas entrantes',
    items: [
      { name: 'Configuración en 5 minutos', starter: true, pro: true, enterprise: true },
      { name: 'Recepcionista AI entrenada en tu negocio', starter: true, pro: true, enterprise: true },
      { name: 'Soporte 32 idiomas', starter: true, pro: true, enterprise: true },
      { name: 'Saludo personalizado', starter: true, pro: true, enterprise: true },
      { name: 'FAQs y respuestas personalizadas', starter: true, pro: true, enterprise: true },
      { name: 'Cuestionarios de admisión personalizados', starter: true, pro: true, enterprise: true },
      { name: 'Transferencia de llamadas', starter: true, pro: true, enterprise: true },
      { name: 'Bloqueo de spam', starter: true, pro: true, enterprise: true },
      { name: 'Integración con calendario', starter: true, pro: true, enterprise: true },
      { name: 'Link de reserva por SMS al cliente', starter: true, pro: true, enterprise: true },
      { name: 'Eliminar marca ConsultIA', starter: false, pro: true, enterprise: true },
      { name: 'Agentes de SMS y chat de Facebook', starter: false, pro: true, enterprise: true },
      { name: 'Prompts totalmente personalizados', starter: false, pro: false, enterprise: true },
      { name: 'Sistemas multi-agente', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Llamadas salientes',
    items: [
      { name: 'Reintentos automáticos', starter: false, pro: true, enterprise: true },
      { name: 'Campañas de llamadas salientes', starter: false, pro: true, enterprise: true },
      { name: 'Integración con formularios Meta (Facebook/Instagram)', starter: false, pro: true, enterprise: true },
      { name: 'Detección de buzón de voz', starter: false, pro: true, enterprise: true },
      { name: 'Detección de IVR (menús telefónicos)', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Seguimiento e informes',
    items: [
      { name: 'Transcripción de llamadas', starter: true, pro: true, enterprise: true },
      { name: 'Resumen por SMS y email', starter: true, pro: true, enterprise: true },
      { name: 'Resumen por SMS al cliente', starter: true, pro: true, enterprise: true },
      { name: 'Registro de llamadas', starter: true, pro: true, enterprise: true },
      { name: 'Panel de control', starter: true, pro: true, enterprise: true },
      { name: 'Analíticas avanzadas', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Integraciones',
    items: [
      { name: '1 número +34 gratuito', starter: true, pro: true, enterprise: true },
      { name: 'Integración nativa con CRM', starter: false, pro: true, enterprise: true },
      { name: 'Integración API personalizada', starter: false, pro: false, enterprise: true },
      { name: 'Webhooks pre y post llamada', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Escalabilidad empresarial',
    items: [
      { name: 'Múltiples ubicaciones', starter: false, pro: false, enterprise: true },
      { name: 'Soporte multi-franquicia', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Cumplimiento',
    items: [
      { name: 'Cumplimiento RGPD', starter: true, pro: true, enterprise: true },
      { name: 'Soberanía de datos', starter: false, pro: false, enterprise: true },
    ],
  },
  {
    category: 'Soporte y formación',
    items: [
      { name: 'Soporte por email', starter: true, pro: true, enterprise: true },
      { name: 'Formación avanzada del agente', starter: false, pro: false, enterprise: true },
      { name: 'Soporte dedicado por Slack', starter: false, pro: false, enterprise: true },
      { name: 'Onboarding personalizado', starter: false, pro: false, enterprise: true },
    ],
  },
]

const faqs = [
  {
    question: '¿Cuánto cuesta el servicio de ConsultIA?',
    answer: 'ConsultIA comienza en 29€/mes por 150 minutos. Los planes escalan según uso: 300 minutos (58€/mes), 450 minutos (87€/mes), 600 minutos (116€/mes) y 750 minutos (145€/mes). Todos los planes incluyen recepcionista AI, soporte 32 idiomas, integración calendario y transcripciones.',
  },
  {
    question: '¿Cómo se compara ConsultIA con una recepcionista tradicional?',
    answer: 'ConsultIA cuesta desde 29€/mes con cobertura AI 24/7, mientras que una recepcionista tradicional cuesta desde 1.500€/mes solo en horario laboral. ConsultIA ofrece respuesta instantánea sin tiempos de espera.',
  },
  {
    question: '¿Es ConsultIA más barato que contratar una recepcionista?',
    answer: 'Sí. Una recepcionista a tiempo completo cuesta 18.000-25.000€/año más Seguridad Social. ConsultIA cuesta 348-1.740€/año (29-145€/mes) y funciona 24/7/365 sin vacaciones, bajas o festivos.',
  },
  {
    question: '¿ConsultIA ofrece garantía de devolución?',
    answer: 'Sí, ConsultIA ofrece garantía de devolución de 30 días. Si no estás satisfecho en 30 días, recibirás un reembolso completo, sin preguntas.',
  },
  {
    question: '¿Cuánto tiempo se tarda en configurar ConsultIA?',
    answer: 'ConsultIA se puede configurar en solo 5 minutos. La recepcionista AI se entrena con la información de tu negocio y está lista para atender llamadas inmediatamente.',
  },
  {
    question: '¿Qué pasa si necesito más minutos?',
    answer: 'Puedes actualizar tu plan en cualquier momento desde el panel de control. Los minutos adicionales se facturan a 0,15€/min. No hay interrupciones del servicio si superas tu cuota mensual.',
  },
]

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <main className="min-h-screen bg-dark pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <p className="text-text-secondary mb-4">Confían en nosotros más de 100 negocios en España</p>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-white mb-6">
            Precios
          </h1>
          <p className="text-xl text-text-primary max-w-3xl mx-auto">
            Precios simples y transparentes para cada tamaño de negocio.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2 rounded-full font-medium transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-primary text-white'
                : 'bg-dark-lighter text-text-secondary hover:text-white'
            }`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2 rounded-full font-medium transition-all relative ${
              billingPeriod === 'yearly'
                ? 'bg-primary text-white'
                : 'bg-dark-lighter text-text-secondary hover:text-white'
            }`}
          >
            Anual
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
              20% OFF
            </span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all duration-300 animate-fade-in ${
                plan.popular
                  ? 'bg-primary/10 border-2 border-primary shadow-xl shadow-primary/20'
                  : 'bg-dark-lighter border border-white/10'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Más popular
                  </span>
                </div>
              )}

              <h3 className="text-2xl font-heading font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-text-secondary mb-6">{plan.description}</p>

              <div className="mb-8">
                {plan.price ? (
                  <div className="flex items-baseline">
                    <span className="text-5xl font-heading font-bold text-white">
                      {billingPeriod === 'monthly' ? plan.price : plan.yearlyPrice}€
                    </span>
                    <span className="text-text-secondary ml-2">/mes</span>
                  </div>
                ) : (
                  <div className="text-3xl font-heading font-bold text-white">Personalizado</div>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-primary flex-shrink-0 mr-3 mt-0.5" />
                    <span className="text-text-primary text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={!plan.available}
                className={`w-full py-3 rounded-full font-medium transition-all ${
                  plan.available
                    ? plan.popular
                      ? 'bg-primary hover:bg-primary-600 text-white shadow-lg shadow-primary/50'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                    : 'bg-white/5 text-text-secondary cursor-not-allowed'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Money-back Guarantee */}
        <div className="text-center mb-20">
          <h3 className="text-2xl font-heading font-bold text-white mb-4">
            Garantía de devolución de 30 días
          </h3>
          <p className="text-text-primary max-w-2xl mx-auto">
            Prueba sin riesgo. Si no estás satisfecho en 30 días, te devolvemos el dinero, sin preguntas.
          </p>
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-20">
          <h2 className="text-4xl font-heading font-bold text-white mb-8 text-center">
            Comparar funcionalidades
          </h2>
          <p className="text-text-primary text-center mb-12">
            Mira qué incluye cada plan
          </p>

          <div className="bg-dark-lighter border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-6 text-white font-semibold">Funcionalidad</th>
                    <th className="text-center py-4 px-6 text-white font-semibold">Starter</th>
                    <th className="text-center py-4 px-6 text-white font-semibold">Profesional</th>
                    <th className="text-center py-4 px-6 text-white font-semibold">Empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((category) => (
                    <>
                      <tr key={category.category} className="bg-white/5">
                        <td colSpan={4} className="py-3 px-6 text-primary font-semibold">
                          {category.category}
                        </td>
                      </tr>
                      {category.items.map((feature, i) => (
                        <tr key={i} className="border-b border-white/10">
                          <td className="py-4 px-6 text-text-primary">{feature.name}</td>
                          <td className="text-center py-4 px-6">
                            {feature.starter ? (
                              <CheckIcon className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <XMarkIcon className="h-5 w-5 text-text-secondary mx-auto" />
                            )}
                          </td>
                          <td className="text-center py-4 px-6">
                            {feature.pro ? (
                              <CheckIcon className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <XMarkIcon className="h-5 w-5 text-text-secondary mx-auto" />
                            )}
                          </td>
                          <td className="text-center py-4 px-6">
                            {feature.enterprise ? (
                              <CheckIcon className="h-5 w-5 text-primary mx-auto" />
                            ) : (
                              <XMarkIcon className="h-5 w-5 text-text-secondary mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQs */}
        <div className="mb-20">
          <h2 className="text-4xl font-heading font-bold text-white mb-8 text-center">
            Preguntas frecuentes
          </h2>
          <p className="text-text-primary text-center mb-12">
            Preguntas comunes sobre precios de ConsultIA
          </p>

          <div className="max-w-4xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-dark-lighter border border-white/10 rounded-xl p-6"
              >
                <h3 className="text-lg font-semibold text-white mb-3">{faq.question}</h3>
                <p className="text-text-primary leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-text-primary mb-8 max-w-2xl mx-auto">
            Únete a cientos de negocios que ya están usando ConsultIA.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-full font-medium transition-all hover:shadow-lg hover:shadow-primary/50 text-lg">
              Empezar en 5 minutos
            </button>
            <Link href="/enterprise">
              <button className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full font-medium transition-all border border-white/10 hover:border-white/20 text-lg">
                Hablar con ventas
              </button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
