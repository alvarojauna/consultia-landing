'use client'

import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

const faqs = [
  {
    question: '¿Cómo funciona el proceso de configuración?',
    answer: 'ConsultIA tarda solo 5 minutos en configurarse. Introduce la URL de tu web y nuestro sistema escanea automáticamente tus servicios, horarios, precios y ubicación. Luego eliges una voz (masculina/femenina, formal/cercano) y recibes un número +34. Configuras el desvío de llamadas con un código simple (*61) y ya está listo.',
  },
  {
    question: '¿Puedo transferir llamadas a mi móvil?',
    answer: 'Sí, absolutamente. Tu teléfono suena primero. Si estás ocupado, en otra llamada o simplemente no quieres contestar, ConsultIA toma la llamada automáticamente. También puedes configurar transferencias directas para casos específicos (emergencias, clientes VIP, etc.).',
  },
  {
    question: '¿Es compatible con RGPD?',
    answer: 'Sí, 100%. Toda nuestra infraestructura está en la UE (AWS región Irlanda/Frankfurt). Al inicio de cada llamada, la IA informa que es un asistente virtual y que la llamada puede ser procesada. Cumplimos con RGPD, LOPD y ofrecemos DPA (Data Processing Agreement) para negocios que manejan datos sensibles como clínicas.',
  },
  {
    question: '¿Qué pasa si se acaban los minutos?',
    answer: 'Recibirás un aviso por email al llegar al 80% y al 100% de tu cuota mensual. Puedes comprar minutos adicionales a 0.15€/min o actualizar tu plan en cualquier momento. El servicio nunca se interrumpe; si superas el límite, los minutos extra se facturan al final del mes.',
  },
  {
    question: '¿Puedo usar mi número actual?',
    answer: 'Sí. No necesitas cambiar de número. Simplemente activas el desvío condicional de llamadas (*61 en la mayoría de operadores españoles) para que ConsultIA responda cuando no puedas atender. Tu número sigue siendo el mismo para tus clientes.',
  },
  {
    question: '¿Cómo se agenda en mi calendario?',
    answer: 'ConsultIA se integra directamente con Google Calendar, Microsoft Outlook, Calendly, Cal.com y Doctoralia. Cuando un cliente solicita una cita, la IA consulta tu disponibilidad en tiempo real, propone horarios libres y confirma la reserva automáticamente. Recibes una notificación al instante.',
  },
  {
    question: '¿Funciona con Doctoralia/otras plataformas?',
    answer: 'Sí. Tenemos integración nativa con Doctoralia (muy popular en clínicas españolas), así como con sistemas de gestión como Clinic Cloud, MediQuo, y otras plataformas de reservas españolas. Para sistemas legacy o personalizados, ofrecemos API access en el plan Empresa.',
  },
  {
    question: '¿Puedo cambiar la voz o el tono?',
    answer: 'Sí, en cualquier momento desde el panel. Ofrecemos voces masculinas y femeninas con diferentes tonos: formal (para despachos/clínicas), cercano (para peluquerías/comercios), profesional (para servicios técnicos). También puedes ajustar la velocidad y el estilo de conversación.',
  },
  {
    question: '¿Hay permanencia?',
    answer: 'No. Todos los planes son mensuales sin permanencia. Puedes cancelar en cualquier momento desde el panel de control y el servicio se desactiva al final del período de facturación. Los primeros 30 días tienes garantía de devolución completa si no estás satisfecho.',
  },
  {
    question: '¿Ofrecen soporte en español?',
    answer: 'Sí, todo nuestro soporte es en español. El plan Starter incluye soporte por email (respuesta <24h), el plan Profesional tiene soporte prioritario (respuesta <4h), y el plan Empresa incluye un account manager dedicado con WhatsApp directo y videollamadas de onboarding.',
  },
]

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="bg-dark border border-white/10 rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="text-lg font-semibold text-white pr-8">
          {faq.question}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-primary transition-transform flex-shrink-0 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-5 animate-fade-in">
          <p className="text-text-secondary leading-relaxed">
            {faq.answer}
          </p>
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  return (
    <section className="py-24 bg-dark-lighter">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-white mb-6">
            Preguntas frecuentes
          </h2>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4 animate-fade-in-delay-1">
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
