import {
  HeartIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  TruckIcon,
  BuildingOfficeIcon,
  HomeIcon,
  BuildingStorefrontIcon,
  WrenchIcon,
} from '@heroicons/react/24/outline'

export interface Industry {
  slug: string
  name: string
  icon: any
  description: string
  painPoints: string[]
  benefits: string[]
  stats: Array<{ label: string; value: string }>
  examples: string[]
}

export const industries: Industry[] = [
  {
    slug: 'clinicas',
    name: 'Clínicas Dentales y Médicas',
    icon: HeartIcon,
    description: 'ConsultIA gestiona las llamadas de pacientes mientras tu equipo se enfoca en la atención médica. Agenda citas, confirma horarios y filtra spam telefónico.',
    painPoints: [
      'Llamadas perdidas durante consultas = pacientes que van a la competencia',
      'Personal administrativo saturado en horario pico',
      'Cancelaciones sin avisar que dejan huecos en la agenda',
      'Llamadas comerciales que interrumpen el flujo de trabajo',
    ],
    benefits: [
      'Atención 24/7: Pacientes pueden agendar fuera de horario',
      'Integración con Doctoralia, Clinic Cloud y calendarios médicos',
      'Cumplimiento RGPD: Servidores en UE, DPA incluido',
      'Recordatorios automáticos reducen no-shows en 40%',
    ],
    stats: [
      { label: 'Llamadas atendidas', value: '99.5%' },
      { label: 'Reducción no-shows', value: '40%' },
      { label: 'Ahorro mensual', value: '800€' },
    ],
    examples: [
      'Clínica Dental Bilbao: 150+ citas/mes gestionadas automáticamente',
      'Centro Médico Valencia: Liberó 20h/mes de recepcionista',
    ],
  },
  {
    slug: 'veterinarias',
    name: 'Veterinarias',
    icon: HeartIcon,
    description: 'Desde emergencias hasta chequeos rutinarios, ConsultIA maneja todas las llamadas de tu veterinaria con empatía y profesionalismo.',
    painPoints: [
      'Emergencias nocturnas mal gestionadas por servicios externos',
      'Dueños frustrados al no poder agendar vacunaciones',
      'Confusión con horarios de recogida post-cirugía',
      'Llamadas de vendedores de comida/productos para mascotas',
    ],
    benefits: [
      'Protocolo de emergencias: Identifica urgencias y te alerta inmediatamente',
      'Agenda inteligente: Distingue consultas cortas (vacunas) de largas (cirugías)',
      'Multiidioma: Atiende turistas con mascotas (inglés, francés)',
      'Base de conocimiento: Responde FAQs (horarios, servicios, precios)',
    ],
    stats: [
      { label: 'Emergencias priorizadas', value: '100%' },
      { label: 'Idiomas soportados', value: '5' },
      { label: 'Consultas resueltas sin transferir', value: '65%' },
    ],
    examples: [
      'Veterinaria Málaga: Atendió 89 llamadas en un fin de semana festivo',
      'Clínica Veterinaria Barcelona: Aumentó citas en 30% al captar llamadas nocturnas',
    ],
  },
  {
    slug: 'peluquerias',
    name: 'Peluquerías y Centros de Estética',
    icon: SparklesIcon,
    description: 'Deja que ConsultIA maneje reservas, cambios y cancelaciones mientras tú te enfocas en tus clientes. Integración con calendarios de salones.',
    painPoints: [
      'Llamadas durante servicios interrumpen el trabajo con tijeras/secador',
      'Clientes que quieren agendar fuera de horario (noches, domingos)',
      'Confusión con precios de servicios combinados (tinte + corte + peinado)',
      'No-shows que dejan huecos difíciles de rellenar',
    ],
    benefits: [
      'Reserva instantánea: Cliente llama, IA verifica agenda, confirma cita',
      'Descripción de servicios: Explica diferencias entre balayage, mechas, ombré',
      'Recordatorios automáticos: SMS/WhatsApp 24h antes',
      'Gestión de lista de espera: Llena huecos de cancelaciones',
    ],
    stats: [
      { label: 'Citas cerradas automáticamente', value: '85%' },
      { label: 'No-shows reducidos', value: '35%' },
      { label: 'Horas ahorradas/mes', value: '15h' },
    ],
    examples: [
      'Salón de Belleza Madrid: 120 citas/mes sin tocar el teléfono',
      'Peluquería Sevilla: Llenó 80% de cancelaciones con lista de espera automática',
    ],
  },
  {
    slug: 'talleres',
    name: 'Talleres Mecánicos',
    icon: WrenchScrewdriverIcon,
    description: 'ConsultIA atiende mientras trabajas bajo el capó. Agenda revisiones, explica servicios y filtra llamadas comerciales de proveedores.',
    painPoints: [
      'Manos sucias de grasa = imposible contestar teléfono',
      'Clientes quieren presupuestos inmediatos (cambio aceite, frenos, ITV)',
      'Llamadas de vendedores de neumáticos/recambios en horario de trabajo',
      'Confusión con servicios: ¿La ITV incluye pre-ITV? ¿Cuánto cuesta diagnóstico?',
    ],
    benefits: [
      'Presupuestos básicos: IA da rangos de precios para servicios comunes',
      'Priorización: Identifica averías urgentes (ruido frenos, humo motor)',
      'Seguimiento: Llama para recordar revisiones periódicas (cada 10.000km)',
      'Integración con software de taller (TallerPro, Autopistas)',
    ],
    stats: [
      { label: 'Llamadas atendidas sin interrumpir trabajo', value: '100%' },
      { label: 'Citas ITV agendadas', value: '95%' },
      { label: 'Spam bloqueado', value: '70%' },
    ],
    examples: [
      'Taller Bilbao: Aumentó citas ITV en 40% al captar llamadas fuera de horario',
      'Mecánico Zaragoza: Ahorró 10h/mes bloqueando llamadas comerciales',
    ],
  },
  {
    slug: 'restaurantes',
    name: 'Restaurantes y Hostelería',
    icon: BuildingStorefrontIcon,
    description: 'Gestión de reservas 24/7. ConsultIA maneja llamadas durante el servicio, responde sobre menús y alergias, y optimiza tu ocupación.',
    painPoints: [
      'Llamadas durante el servicio de comida/cena saturan al staff',
      'Reservas para grupos grandes requieren confirmación y señal',
      'Preguntas sobre alérgenos, menús sin gluten, opciones veganas',
      'Cancelaciones last-minute dejan mesas vacías',
    ],
    benefits: [
      'Reservas inteligentes: Consulta disponibilidad en tiempo real',
      'Menú digital: Responde sobre platos, ingredientes, alérgenos',
      'Gestión de grupos: Protocolo especial para reservas >8 personas',
      'Lista de espera: Llena mesas de cancelaciones',
    ],
    stats: [
      { label: 'Reservas capturadas fuera de horario', value: '30%' },
      { label: 'Ocupación aumentada', value: '15%' },
      { label: 'Consultas de alérgenos resueltas', value: '90%' },
    ],
    examples: [
      'Restaurante San Sebastián: 200+ reservas/mes sin personal dedicado',
      'Tasca Madrid: Llenó 25 mesas/mes con lista de espera automática',
    ],
  },
  {
    slug: 'despachos',
    name: 'Despachos de Abogados',
    icon: BuildingOfficeIcon,
    description: 'Primera impresión profesional. ConsultIA filtra consultas, agenda primeras visitas y transfiere casos urgentes según tu disponibilidad.',
    painPoints: [
      'Llamadas interrumpen reuniones con clientes y vistas judiciales',
      'Consultas gratuitas consumen tiempo sin conversión',
      'Clientes frustrados al llegar a buzón de voz',
      'Dificultad para clasificar urgencia (despido, divorcio, herencia)',
    ],
    benefits: [
      'Cualificación de leads: Hace preguntas clave antes de agendar',
      'Confidencialidad: Informa sobre RGPD y secreto profesional',
      'Clasificación por especialidad: Civil, penal, laboral, mercantil',
      'Integración con software jurídico (Lex-Quid, Infolex)',
    ],
    stats: [
      { label: 'Consultas cualificadas', value: '80%' },
      { label: 'Tiempo ahorrado en filtrado', value: '12h/mes' },
      { label: 'Primera impresión profesional', value: '100%' },
    ],
    examples: [
      'Despacho Valencia: Aumentó conversión 25% con mejor cualificación',
      'Bufete Barcelona: Liberó secretaria para tareas de mayor valor',
    ],
  },
  {
    slug: 'inmobiliarias',
    name: 'Inmobiliarias',
    icon: HomeIcon,
    description: 'Captura leads mientras visitas propiedades. ConsultIA agenda visitas, responde sobre inmuebles y filtra curiosos de compradores serios.',
    painPoints: [
      'Llamadas durante visitas con clientes son poco profesionales',
      'Curiosos que piden información pero nunca compran',
      'Consultas sobre múltiples propiedades requieren búsqueda en base de datos',
      'Horarios de visita difíciles de coordinar (propietario + comprador)',
    ],
    benefits: [
      'Información de propiedades: Responde sobre precio, m², habitaciones, zona',
      'Cualificación: Pregunta sobre presupuesto, urgencia, financiación',
      'Agenda coordinada: Busca huecos compatibles con propietarios',
      'Integración con portales (Idealista, Fotocasa)',
    ],
    stats: [
      { label: 'Leads capturados 24/7', value: '100%' },
      { label: 'Visitas agendadas sin llamada', value: '70%' },
      { label: 'Cualificación previa', value: '85%' },
    ],
    examples: [
      'Inmobiliaria Madrid: 180 leads/mes capturados fuera de horario',
      'Agente Barcelona: Ahorró 15h/mes en llamadas de baja calidad',
    ],
  },
  {
    slug: 'construccion',
    name: 'Construcción y Reformas',
    icon: WrenchIcon,
    description: 'Atiende llamadas desde la obra. ConsultIA agenda visitas para presupuestos, responde FAQs sobre reformas y filtra proyectos no rentables.',
    painPoints: [
      'Imposible contestar en obra (ruido, manos ocupadas)',
      'Clientes quieren presupuestos inmediatos (cocina, baño, tejado)',
      'Consultas sobre permisos, plazos, materiales',
      'Proyectos muy pequeños no son rentables pero consumen tiempo',
    ],
    benefits: [
      'Captura de proyectos: Toma datos básicos (tipo reforma, m², presupuesto)',
      'Filtrado por tamaño: Redirige proyectos <5000€ a formulario web',
      'Agenda de visitas: Coordina citas para presupuesto en ubicación',
      'FAQs construcción: Responde sobre plazos típicos, permisos, garantías',
    ],
    stats: [
      { label: 'Llamadas capturadas en obra', value: '100%' },
      { label: 'Proyectos cualificados', value: '75%' },
      { label: 'Tiempo ahorrado en proyectos no rentables', value: '10h/mes' },
    ],
    examples: [
      'Constructora Bilbao: 45 presupuestos/mes agendados automáticamente',
      'Reformas Valencia: Filtró 60% de consultas no viables, enfocándose en proyectos >10k€',
    ],
  },
]

export function getIndustryBySlug(slug: string): Industry | undefined {
  return industries.find((industry) => industry.slug === slug)
}

export function getAllIndustrySlugs(): string[] {
  return industries.map((industry) => industry.slug)
}
