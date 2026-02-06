'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MagnifyingGlassIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline'
import { blogPosts, categories } from '../../lib/blog-posts'

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredPosts = blogPosts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' ||
                           post.category.toLowerCase() === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <main className="min-h-screen bg-dark pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-white mb-6">
            Blog de <span className="text-primary">ConsultIA</span>
          </h1>
          <p className="text-xl text-text-primary max-w-3xl mx-auto">
            Guías, casos de uso y mejores prácticas sobre recepcionistas AI para negocios españoles.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8 animate-fade-in-delay-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
            <input
              type="text"
              placeholder="Buscar artículos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-lighter border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-text-secondary focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12 animate-fade-in-delay-2">
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
        </div>

        {/* Results Count */}
        <div className="text-center text-text-secondary mb-8">
          Mostrando {filteredPosts.length} de {blogPosts.length} artículos
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {filteredPosts.map((post, index) => (
            <article key={post.slug} className="animate-fade-in">
              <Link href={`/blog/${post.slug}`}>
                <div className="bg-dark-lighter border border-white/10 rounded-xl overflow-hidden h-full hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 group">
                  {/* Category Badge */}
                  <div className="p-6 pb-0">
                    <span className="inline-block text-xs px-3 py-1 bg-primary/10 text-primary rounded-full mb-4">
                      {post.category}
                    </span>
                  </div>

                  <div className="p-6 pt-2">
                    {/* Title */}
                    <h2 className="text-xl font-heading font-bold text-white mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-text-secondary text-sm leading-relaxed mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-xs text-text-secondary">
                      <div className="flex items-center gap-1">
                        <UserIcon className="h-4 w-4" />
                        <span>{post.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{post.readTime} lectura</span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <span className="text-xs text-text-secondary">{post.date}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        {/* No Results */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-text-secondary text-lg mb-4">
              No se encontraron artículos que coincidan con tu búsqueda
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

        {/* Newsletter CTA */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            Mantente actualizado
          </h2>
          <p className="text-text-primary mb-8 max-w-2xl mx-auto">
            Recibe las últimas guías, casos de uso y mejores prácticas sobre IA de voz directamente en tu bandeja de entrada.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
            <input
              type="email"
              placeholder="tu@email.com"
              className="w-full bg-dark border border-white/10 rounded-full px-6 py-4 text-white placeholder-text-secondary focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button className="w-full sm:w-auto bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-full font-semibold transition-all hover:shadow-lg hover:shadow-primary/50 whitespace-nowrap">
              Suscribirse
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
