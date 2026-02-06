import Link from 'next/link'
import { CheckIcon, ShieldCheckIcon, ServerIcon, ChartBarIcon } from '@heroicons/react/24/solid'

export const metadata = {
  title: 'Solución Enterprise de IA de Voz | ConsultIA',
  description: 'La capa de aplicación para voice AI empresarial. Totalmente gestionada. Cloud o on-premise. Cumplimiento garantizado.',
}

export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-dark pt-24 pb-16">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <h1 className="text-6xl sm:text-7xl lg:text-8xl font-heading font-light text-white mb-8 leading-tight">
              IA de Voz <span className="text-primary">que suena humana,</span><br />
              para centros de<br />
              llamadas empresariales.
            </h1>
            <p className="text-2xl text-text-primary mb-8 leading-relaxed">
              La capa de aplicación para voice AI empresarial. Totalmente gestionada.
              Cloud o on-premise. Cumplimiento garantizado.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-full font-semibold transition-all hover:shadow-lg hover:shadow-primary/50 text-lg">
                Contactar con nuestro equipo
              </button>
              <button className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full font-semibold transition-all border border-white/10 hover:border-white/20 text-lg">
                Conoce nuestro proceso gestionado
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-dark-lighter">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-4">
            Integrado con las plataformas líderes.
          </h2>
          <p className="text-text-primary mb-12">
            Conecta sin problemas con las herramientas y servicios que ya usas.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
            {['Salesforce', 'HubSpot', 'Zendesk', 'Microsoft Dynamics', 'SAP', 'Oracle', 'ServiceNow', 'Twilio'].map((platform) => (
              <div key={platform} className="text-text-secondary hover:text-white transition-colors text-lg font-medium">
                {platform}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Security */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-heading font-bold text-white mb-6 leading-tight">
                Seguridad <span className="text-primary">empresarial</span> y residencia<br />
                estricta de datos.
              </h2>
              <p className="text-xl text-text-primary leading-relaxed">
                Nuestra plataforma está arquitecturada para cumplir los requisitos más rigurosos de CISO,
                asegurando que tus datos permanezcan seguros, conformes y dentro de tu jurisdicción legal.
              </p>
            </div>
            <div className="space-y-6">
              <div className="bg-dark-lighter border border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <ServerIcon className="h-8 w-8 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-heading font-bold text-white mb-2">
                      Residencia de datos configurable
                    </h3>
                    <p className="text-text-secondary">
                      Despliega ConsultIA on-premise vía Docker, o en tu nube privada. Tus agentes de voz
                      procesan y almacenan datos estrictamente dentro de tu propia infraestructura.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-dark-lighter border border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <ShieldCheckIcon className="h-8 w-8 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-heading font-bold text-white mb-2">
                      Marcos de cumplimiento global
                    </h3>
                    <p className="text-text-secondary">
                      Nuestra postura de seguridad se alinea con los estándares más altos. Soportamos
                      cumplimiento con RGPD, ISO 27001, y SOC 2 Type II, asegurando gestión robusta
                      de riesgo de terceros.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-dark-lighter border border-white/10 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <ChartBarIcon className="h-8 w-8 text-primary flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-heading font-bold text-white mb-2">
                      Auditorías independientes y 99.99% uptime
                    </h3>
                    <p className="text-text-secondary">
                      Facilitamos pruebas de penetración independientes y auditorías de seguridad
                      por terceros seleccionados. Respaldado por un SLA de 99.99% de uptime financieramente
                      garantizado para tus servicios críticos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Managed Process */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-lighter">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-heading font-bold text-white mb-6 leading-tight">
              Tu camino hacia una<br />
              <span className="text-primary">solución totalmente gestionada.</span>
            </h2>
            <p className="text-xl text-text-primary max-w-3xl mx-auto">
              Una asociación estratégica diseñada para mínimo esfuerzo de tus equipos internos
              y bajo impacto en tu hoja de ruta existente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                number: '01',
                title: 'Diseñar e integrar',
                description: 'Comenzamos mapeando tus flujos de trabajo existentes y stack técnico. Nuestros arquitectos de soluciones diseñan el plan end-to-end, enfocándose en construir las integraciones personalizadas requeridas para conectar con tus sistemas únicos, legacy o modernos.',
              },
              {
                number: '02',
                title: 'Construir y desplegar',
                description: 'Nuestros ingenieros manejan el 100% de la construcción. Configuramos, entrenamos y probamos los agentes. Luego desplegamos usando un modelo de transición probado y de bajo impacto, asegurando una experiencia perfecta para tus clientes y equipos.',
              },
              {
                number: '03',
                title: 'Gestionar y optimizar',
                description: 'Monitorizamos proactivamente 24/7, gestionamos todas las actualizaciones y aseguramos que tu SLA siempre se cumple. Analizamos continuamente el rendimiento y nos asociamos contigo para optimizar y escalar la solución a medida que tu negocio evoluciona.',
              },
            ].map((step) => (
              <div key={step.number} className="bg-dark border border-white/10 rounded-xl p-8">
                <div className="text-6xl font-heading font-bold text-primary/20 mb-4">
                  {step.number}
                </div>
                <h3 className="text-2xl font-heading font-bold text-white mb-4">{step.title}</h3>
                <p className="text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-dark-lighter border border-white/10 rounded-2xl p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <div className="text-3xl font-heading font-bold text-white mb-6 leading-tight">
                  Pruebas, no promesas.
                </div>
                <blockquote className="text-text-primary text-lg leading-relaxed italic mb-6">
                  "No solo estoy contento, ¡todavía estoy en shock! Esta es solo la versión 2, en vivo
                  durante unos pocos días, y ya está superando con creces a cualquier recepcionista que
                  hayamos tenido en 16 años... Los humanos ahora están haciendo MEJOR porque pueden
                  devolver llamadas solo a aquellas personas que son leads calientes, y sus estadísticas
                  son el triple de lo que eran."
                </blockquote>
                <div>
                  <div className="font-semibold text-white">Carlos Martínez</div>
                  <div className="text-text-secondary">CEO, Bufete Legal Madrid</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="text-center">
                  <div className="text-5xl font-heading font-bold text-primary mb-2">5M+</div>
                  <div className="text-text-secondary">Interacciones automatizadas procesadas anualmente</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-heading font-bold text-primary mb-2">4</div>
                  <div className="text-text-secondary">Semanas promedio de despliegue para sistemas complejos</div>
                </div>
                <div className="text-center">
                  <div className="text-5xl font-heading font-bold text-primary mb-2">100%</div>
                  <div className="text-text-secondary">Soporte e ingeniería con base en España</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-dark-lighter">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-heading font-bold text-white mb-6">
              El poder de una <span className="text-primary">plataforma,</span><br />
              el servicio de un <span className="text-primary">partner</span>
            </h2>
            <p className="text-xl text-text-primary max-w-3xl mx-auto">
              No elijas entre una plataforma DIY compleja y un consultor que no posee la tecnología.
              Obtén un único partner que hace ambas cosas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Un partner, propiedad total',
                description: 'Poseemos la plataforma y el servicio, lo que significa cero excusas y responsabilidad completa.',
              },
              {
                title: 'Construido para sistemas legacy y propietarios',
                description: 'Nuestros ingenieros construyen las integraciones personalizadas que necesitas. No hay "quitar y reemplazar".',
              },
              {
                title: 'Personalización profunda',
                description: 'Somos la fábrica, no un revendedor. Elige tus propios proveedores de TTS, LLM y telefonía, incluidos modelos on-premise.',
              },
              {
                title: 'Asociación enfocada en tu ROI',
                description: 'Nuestro éxito se mide por los resultados de tu negocio, no por "puestos" o "licencias".',
              },
              {
                title: 'Gestión proactiva onshore 24/7',
                description: 'Un verdadero servicio gestionado con un SLA respaldado financieramente y un equipo de soporte local.',
              },
              {
                title: 'Cero esfuerzo de ingeniería interna',
                description: 'Deja de preocuparte por prompt engineering, latencia o mantenimiento de API. No solo te damos un login; desplegamos en tu entorno y monitorizamos 24/7.',
              },
            ].map((item, index) => (
              <div key={index} className="bg-dark border border-white/10 rounded-xl p-6">
                <CheckIcon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-xl font-heading font-bold text-white mb-3">{item.title}</h3>
                <p className="text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-5xl font-heading font-bold text-white mb-6">
            Deja de preocuparte por la infraestructura.<br />
            Comienza a <span className="text-primary">entregar resultados.</span>
          </h2>
          <p className="text-xl text-text-primary mb-12 max-w-3xl mx-auto">
            Los desafíos operacionales complejos requieren una solución a medida, no una demo
            de talla única. Reserva una consulta con nuestros expertos para mapear tu
            estrategia de integración.
          </p>
          <button className="bg-primary hover:bg-primary-600 text-white px-12 py-5 rounded-full font-semibold transition-all hover:shadow-lg hover:shadow-primary/50 text-xl">
            Mapea tu estrategia de integración
          </button>
        </div>
      </section>
    </main>
  )
}
