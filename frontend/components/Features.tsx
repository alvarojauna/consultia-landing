import {
  ClockIcon,
  CalendarIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  LanguageIcon,
  BoltIcon,
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: ClockIcon,
    title: '24/7 en español',
    description: 'Tu recepcionista nunca duerme. Atiende en horario de oficina, noches y festivos.',
  },
  {
    icon: CalendarIcon,
    title: 'Agenda citas automáticamente',
    description: 'Integración con Google Calendar, Calendly y Doctoralia. Sincronización en tiempo real.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Filtra spam y comerciales',
    description: 'Detecta y bloquea llamadas no deseadas. Solo recibes leads cualificados.',
  },
  {
    icon: CheckBadgeIcon,
    title: 'RGPD nativo',
    description: 'Servidores en la UE. Cumplimiento total con protección de datos española.',
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'Respuestas personalizadas',
    description: 'Entrenada con la información de tu web. Responde como si trabajara en tu negocio.',
  },
  {
    icon: PhoneIcon,
    title: 'Números +34 locales',
    description: 'Número español para tu ciudad. Transfiere llamadas cuando sea necesario.',
  },
  {
    icon: LanguageIcon,
    title: 'Multiidioma',
    description: 'Español, catalán, euskera, gallego, inglés. Detecta el idioma automáticamente.',
  },
  {
    icon: BoltIcon,
    title: 'Setup en 5 minutos',
    description: 'Pega tu web, elige una voz, activa. Sin instalaciones ni contratos largos.',
  },
]

export default function Features() {
  return (
    <section className="py-24 bg-dark-lighter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-white mb-6">
            Todo lo que ConsultIA hace por ti
          </h2>
          <p className="text-xl text-text-secondary">
            Funciones esenciales que filtran, cualifican y reservan, para que solo dediques tiempo a clientes reales.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative bg-dark border border-white/10 rounded-2xl p-6 hover:border-primary/50 hover:bg-dark/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="mb-4 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-heading font-semibold text-white mb-2">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
