'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { industries } from '../../lib/industries'

const categories = [
  { id: 'all', name: 'Todos', count: industries.length },
  { id: 'salud', name: 'Salud', count: 2 },
  { id: 'servicios-hogar', name: 'Servicios del Hogar', count: 3 },
  { id: 'profesionales', name: 'Servicios Profesionales', count: 2 },
  { id: 'comercio', name: 'Comercio', count: 1 },
]

const industryCategories: Record<string, string> = {
  'clinicas': 'salud',
  'veterinarias': 'salud',
  'peluquerias': 'servicios-hogar',
  'talleres': 'servicios-hogar',
  'construccion': 'servicios-hogar',
  'despachos': 'profesionales',
  'inmobiliarias': 'profesionales',
  'restaurantes': 'comercio',
}

export default function IndustriesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredIndustries = industries.filter((industry) => {
    const matchesSearch = industry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         industry.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' ||
                           industryCategories[industry.slug] === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <main className="min-h-screen bg-dark pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-white mb-6">
            Recepcionista AI para{' '}
            <span className="text-primary">Industrias Prioritarias</span>
          </h1>
          <p className="text-xl text-text-primary max-w-3xl mx-auto">
            Nunca pierdas una llamada más. La IA de ConsultIA responde 24/7, filtra clientes,
            captura detalles del servicio y agenda citas automáticamente.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-2xl mx-auto mb-8"
        >
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar industrias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-lighter border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-text-secondary focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </motion.div>

        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-12"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/50'
                  : 'bg-dark-lighter text-text-secondary hover:text-white hover:bg-white/5 border border-white/10'
              }`}
            >
              {category.name}
              <span className="ml-2 text-sm opacity-75">({category.count})</span>
            </button>
          ))}
        </motion.div>

        {/* Results Count */}
        <div className="text-center text-text-secondary mb-8">
          Mostrando {filteredIndustries.length} de {industries.length} industrias
        </div>

        {/* Industries Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filteredIndustries.map((industry, index) => (
            <motion.article
              key={industry.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <Link href={`/industries/${industry.slug}`}>
                <div className="bg-dark-lighter border border-white/10 rounded-xl p-6 h-full hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 group">
                  {/* Icon + Category Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <industry.icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-xs px-3 py-1 bg-white/5 text-text-secondary rounded-full">
                      {categories.find(c => c.id === industryCategories[industry.slug])?.name || 'Servicios'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-heading font-bold text-white mb-3 group-hover:text-primary transition-colors">
                    {industry.name}
                  </h3>

                  {/* Description */}
                  <p className="text-text-secondary text-sm leading-relaxed mb-4 line-clamp-3">
                    {industry.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {industry.examples.slice(0, 2).map((example, i) => {
                      // Extract just the business type from the example
                      const businessType = example.split(':')[0]
                      return (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 bg-white/5 text-text-secondary rounded"
                        >
                          {businessType}
                        </span>
                      )
                    })}
                    {industry.examples.length > 2 && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                        +{industry.examples.length - 2} más
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* No Results */}
        {filteredIndustries.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-secondary text-lg mb-4">
              No se encontraron industrias que coincidan con tu búsqueda
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
              }}
              className="text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* CTA Section */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            ¿No ves tu industria?
          </h2>
          <p className="text-text-primary mb-8 max-w-2xl mx-auto">
            ConsultIA funciona para cualquier negocio que reciba llamadas.
            Cuéntanos sobre tu caso y personalizaremos la solución.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-full font-medium transition-all hover:shadow-lg hover:shadow-primary/50 text-lg">
              Hablemos de tu negocio
            </button>
            <Link href="/pricing">
              <button className="bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full font-medium transition-all border border-white/10 hover:border-white/20 text-lg">
                Ver precios
              </button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
