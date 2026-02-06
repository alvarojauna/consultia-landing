import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/solid'
import { getIndustryBySlug, getAllIndustrySlugs } from '../../../lib/industries'

// Generate static params for all industries
export async function generateStaticParams() {
  const slugs = getAllIndustrySlugs()
  return slugs.map((slug) => ({
    slug,
  }))
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const industry = getIndustryBySlug(slug)

  if (!industry) {
    return {
      title: 'Industria no encontrada',
    }
  }

  return {
    title: `Recepcionista AI para ${industry.name} | ConsultIA`,
    description: industry.description,
  }
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const industry = getIndustryBySlug(slug)

  if (!industry) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-dark pt-24 pb-16">
      {/* Hero Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-white mb-6 leading-tight">
              Recepcionista AI para <span className="text-primary">{industry.name}</span>
            </h1>
            <p className="text-xl text-text-primary mb-8 leading-relaxed">
              {industry.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-full font-semibold transition-all hover:shadow-lg hover:shadow-primary/50 text-lg">
                Prueba gratis 30 días
              </button>
              <button className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full font-semibold transition-all border border-white/10 hover:border-white/20 text-lg flex items-center justify-center gap-2">
                Escuchar demo de llamada
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Before & After Comparison */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark-lighter">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* The Old Way */}
            <div className="bg-dark border border-red-500/20 rounded-2xl p-8">
              <div className="text-red-500 font-semibold mb-4">❌ La Forma Antigua</div>
              <h3 className="text-2xl font-heading font-bold text-white mb-4">
                Buzón de voz: "Llamada perdida de 91 XXX XX XX"
              </h3>
              <p className="text-text-secondary">
                Tú: Devolver llamada, filtrar, cualificar, perseguir...
              </p>
            </div>

            {/* The ConsultIA Way */}
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-8">
              <div className="text-primary font-semibold mb-4">✓ Con ConsultIA</div>
              <h3 className="text-2xl font-heading font-bold text-white mb-4">
                Calendario: "{industry.stats[0].label}: Hoy 13:00, Cliente cualificado"
              </h3>
              <p className="text-text-primary">
                Tú: Presentarte y comenzar la relación directamente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Flow */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">
              Tu proceso de filtrado,{' '}
              <span className="text-primary">ejecutado perfectamente.</span> Siempre.
            </h2>
            <p className="text-xl text-text-primary max-w-3xl mx-auto">
              No necesitas una IA que solo tome mensajes. Necesitas una que entienda tu negocio,
              filtre clientes y capture todos los detalles importantes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Identificar',
                description: 'Identifica si es cliente nuevo o existente, verifica área de servicio.',
              },
              {
                step: '2',
                title: 'Filtrar',
                description: 'Determina urgencia, tipo de servicio necesario y si encaja con tus capacidades.',
              },
              {
                step: '3',
                title: 'Cualificar',
                description: 'Hace tus preguntas personalizadas: detalles específicos, ubicación, disponibilidad.',
              },
              {
                step: '4',
                title: 'Agendar',
                description: 'Envía link de reserva por SMS, tú recibes resumen completo con contexto.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-dark-lighter border border-white/10 rounded-xl p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-2xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-heading font-bold text-white mb-3">{item.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark-lighter">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {industry.stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-5xl sm:text-6xl font-heading font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-text-primary">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Message Taking Doesn't Work */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-12 text-center">
            Por qué "tomar mensajes" no funciona para {industry.name.toLowerCase()}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Voicemail */}
            <div className="bg-dark-lighter border border-red-500/20 rounded-xl p-8">
              <div className="text-red-500 font-bold mb-4">❌ Buzón de voz</div>
              <div className="mb-6">
                <div className="font-semibold text-white mb-2">El Problema:</div>
                <p className="text-text-secondary text-sm">{industry.painPoints[0]}</p>
              </div>
              <div>
                <div className="font-semibold text-white mb-2">El Resultado:</div>
                <p className="text-text-secondary text-sm">Trabajos perdidos antes de que sepas que llamaron.</p>
              </div>
            </div>

            {/* Generic AI */}
            <div className="bg-dark-lighter border border-yellow-500/20 rounded-xl p-8">
              <div className="text-yellow-500 font-bold mb-4">⚠️ Servicios genéricos</div>
              <div className="mb-6">
                <div className="font-semibold text-white mb-2">El Problema:</div>
                <p className="text-text-secondary text-sm">{industry.painPoints[1]}</p>
              </div>
              <div>
                <div className="font-semibold text-white mb-2">El Resultado:</div>
                <p className="text-text-secondary text-sm">Llamadas de ida y vuelta con clientes que ya contrataron a otro.</p>
              </div>
            </div>

            {/* ConsultIA */}
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-8">
              <div className="text-primary font-bold mb-4">✓ ConsultIA</div>
              <div className="mb-6">
                <div className="font-semibold text-white mb-2">La Solución:</div>
                <p className="text-text-primary text-sm">{industry.benefits[0]}</p>
              </div>
              <div>
                <div className="font-semibold text-white mb-2">El Resultado:</div>
                <p className="text-text-primary text-sm">Trabajos agendados con detalles capturados mientras trabajas.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-lighter">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-heading font-bold text-white mb-12 text-center">
            Compara tus opciones
          </h2>

          <div className="bg-dark border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-white font-semibold">Funcionalidad</th>
                  <th className="text-center py-4 px-4 text-text-secondary text-sm">Buzón</th>
                  <th className="text-center py-4 px-4 text-text-secondary text-sm">Tradicional</th>
                  <th className="text-center py-4 px-4 text-text-secondary text-sm">IA Genérica</th>
                  <th className="text-center py-4 px-4 text-primary font-semibold">ConsultIA</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Disponibilidad 24/7', voicemail: true, traditional: false, generic: true, consultia: true },
                  { feature: 'Filtra urgencias', voicemail: false, traditional: false, generic: false, consultia: true },
                  { feature: 'Preguntas personalizadas', voicemail: false, traditional: true, generic: false, consultia: true },
                  { feature: 'Envía link de reserva', voicemail: false, traditional: false, generic: true, consultia: true },
                  { feature: 'Resumen + Transcripción', voicemail: false, traditional: false, generic: true, consultia: true },
                  { feature: 'Distingue clientes nuevos/existentes', voicemail: false, traditional: true, generic: false, consultia: true },
                  { feature: 'Integración con gestión de trabajos', voicemail: false, traditional: false, generic: false, consultia: true },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/10">
                    <td className="py-4 px-6 text-text-primary">{row.feature}</td>
                    <td className="text-center py-4 px-4">
                      {row.voicemail ? (
                        <CheckIcon className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XMarkIcon className="h-5 w-5 text-text-secondary mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {row.traditional ? (
                        <CheckIcon className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XMarkIcon className="h-5 w-5 text-text-secondary mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {row.generic ? (
                        <CheckIcon className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XMarkIcon className="h-5 w-5 text-text-secondary mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-4 px-4">
                      {row.consultia ? (
                        <CheckIcon className="h-5 w-5 text-primary mx-auto" />
                      ) : (
                        <XMarkIcon className="h-5 w-5 text-text-secondary mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-white/5">
                  <td className="py-4 px-6 text-white font-semibold">Coste</td>
                  <td className="text-center py-4 px-4 text-text-secondary text-sm">Gratis</td>
                  <td className="text-center py-4 px-4 text-text-secondary text-sm">200-400€/mes</td>
                  <td className="text-center py-4 px-4 text-text-secondary text-sm">49-99€/mes</td>
                  <td className="text-center py-4 px-4 text-primary font-semibold">Desde 29€/mes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Success Cases */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-heading font-bold text-white mb-12 text-center">
            Lo que dicen nuestros clientes
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {industry.examples.map((example, index) => (
              <div key={index} className="bg-dark-lighter border border-white/10 rounded-xl p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <industry.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-text-primary leading-relaxed mb-4">"{example}"</p>
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span>Cliente verificado</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setup Steps */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-lighter">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-heading font-bold text-white mb-4 text-center">
            Listo en 5 minutos. Sin soporte técnico requerido.
          </h2>
          <p className="text-text-primary text-center mb-16">
            Configura tu recepcionista AI en tres pasos simples
          </p>

          <div className="space-y-8">
            {[
              {
                step: 'Paso 1',
                title: 'Introduce tu información',
                description: 'Añade tu web y número de teléfono. ConsultIA extrae automáticamente tus áreas de servicio, especialidades y horarios.',
              },
              {
                step: 'Paso 2',
                title: 'Configura tus reglas',
                description: '¿Qué servicios ofreces? ¿Qué preguntas debe hacer? ¿Preferencias de enrutamiento de emergencias? Personaliza tu lógica de admisión en minutos.',
              },
              {
                step: 'Paso 3',
                title: 'Desvía tus llamadas',
                description: 'Instrucciones simples del operador aparecen en pantalla. Marca un código de desvío o escanea el QR, tarda 30 segundos.',
              },
            ].map((item, index) => (
              <div key={index} className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <div className="text-primary font-semibold mb-2">{item.step}</div>
                  <h3 className="text-2xl font-heading font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-text-primary leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}

            <div className="bg-primary/10 border border-primary/30 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-heading font-bold text-white mb-3">Ya está. Estás en marcha.</h3>
              <p className="text-text-primary mb-6">
                Tu coordinador AI responderá llamadas 24/7. Recibirás un resumen después de cada llamada para que nunca pierdas un trabajo cualificado.
              </p>
              <button className="bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-full font-semibold transition-all hover:shadow-lg hover:shadow-primary/50">
                Empezar mi prueba de 30 días
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-6">
            Más trabajos agendados. Menos llamadas perdidas.
          </h2>
          <p className="text-xl text-text-primary mb-12 max-w-3xl mx-auto">
            Cada llamada perdida es un cliente que llama a otro. Comienza a capturar trabajos 24/7.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-full font-semibold transition-all hover:shadow-lg hover:shadow-primary/50 text-lg flex items-center gap-2">
              Prueba gratis 30 días
              <ArrowRightIcon className="h-5 w-5" />
            </button>
            <Link href="/pricing">
              <button className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full font-semibold transition-all border border-white/10 hover:border-white/20 text-lg">
                Ver precios
              </button>
            </Link>
          </div>
          <div className="mt-8 text-text-secondary text-sm">
            Garantía de devolución de 30 días • Configuración en 5 minutos • Cancela cuando quieras
          </div>
        </div>
      </section>
    </main>
  )
}
