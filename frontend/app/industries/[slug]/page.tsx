import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/solid'
import { getIndustryBySlug, getAllIndustrySlugs } from '../../../lib/industries'

// Generate static params for all industries
export async function generateStaticParams() {
  const slugs = getAllIndustrySlugs()
  return slugs.map((slug) => ({
    slug,
  }))
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const industry = getIndustryBySlug(params.slug)

  if (!industry) {
    return {
      title: 'Industria no encontrada',
    }
  }

  return {
    title: `${industry.name} - ConsultIA Recepcionista AI`,
    description: industry.description,
  }
}

export default function IndustryPage({ params }: { params: { slug: string } }) {
  const industry = getIndustryBySlug(params.slug)

  if (!industry) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-dark pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-text-secondary hover:text-white transition-colors mb-8"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="text-sm">Volver al inicio</span>
        </Link>

        {/* Hero Section */}
        <div className="mb-16">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-4 bg-primary/10 rounded-xl">
              <industry.icon className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white">
              {industry.name}
            </h1>
          </div>
          <p className="text-xl text-text-primary max-w-3xl">
            {industry.description}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {industry.stats.map((stat, index) => (
            <div
              key={index}
              className="bg-dark-lighter border border-white/10 rounded-xl p-6 text-center"
            >
              <div className="text-3xl sm:text-4xl font-heading font-bold text-primary mb-2">
                {stat.value}
              </div>
              <div className="text-text-secondary text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Pain Points */}
          <div>
            <h2 className="text-3xl font-heading font-bold text-white mb-6">
              Problemas que resolvemos
            </h2>
            <div className="space-y-4">
              {industry.painPoints.map((point, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-4 bg-dark-lighter border border-white/10 rounded-xl"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center mt-0.5">
                    <span className="text-red-500 text-sm font-bold">✗</span>
                  </div>
                  <p className="text-text-primary text-sm leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Benefits */}
          <div>
            <h2 className="text-3xl font-heading font-bold text-white mb-6">
              Cómo te ayudamos
            </h2>
            <div className="space-y-4">
              {industry.benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-4 bg-dark-lighter border border-primary/20 rounded-xl"
                >
                  <CheckIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-text-primary text-sm leading-relaxed">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Examples */}
        <div className="mb-16">
          <h2 className="text-3xl font-heading font-bold text-white mb-6">
            Casos de éxito
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {industry.examples.map((example, index) => (
              <div
                key={index}
                className="bg-dark-lighter border border-white/10 rounded-xl p-6"
              >
                <p className="text-text-primary leading-relaxed">{example}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            ¿Listo para transformar tu {industry.name.toLowerCase()}?
          </h2>
          <p className="text-text-primary mb-8 max-w-2xl mx-auto">
            Únete a decenas de negocios que ya están usando ConsultIA para no perder ninguna llamada.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-full font-medium transition-all hover:shadow-lg hover:shadow-primary/50 text-lg">
              Empezar en 5 minutos
            </button>
            <button className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full font-medium transition-all border border-white/10 hover:border-white/20 text-lg">
              Ver demo
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
