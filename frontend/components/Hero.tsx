'use client'

import { motion } from 'framer-motion'
import { PlayIcon } from '@heroicons/react/24/solid'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-5xl mx-auto">
          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-heading font-light text-white mb-6 leading-tight tracking-tight"
          >
            Recepcionista AI que{' '}
            <span className="text-primary">atiende llamadas,</span>
            <br />
            <span className="text-primary">agenda citas</span> y{' '}
            <span className="text-primary">filtra spam.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-xl sm:text-2xl text-text-primary mb-10 max-w-3xl mx-auto"
          >
            Mientras tu competencia pierde llamadas, tú cierras citas. Tu recepcionista AI trabaja 24/7 en español con números +34.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <button className="bg-primary hover:bg-primary-600 text-white px-8 py-3 rounded-full text-base font-medium transition-all hover:shadow-2xl hover:shadow-primary/50 hover:scale-105 w-full sm:w-auto">
              Empezar en 5 minutos
            </button>
            <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-full text-base font-medium transition-all border border-white/10 hover:border-white/20 w-full sm:w-auto">
              <PlayIcon className="h-5 w-5" />
              Ver demo
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <div className="text-3xl font-heading font-semibold text-white mb-2">10k+</div>
              <div className="text-sm text-text-secondary">llamadas atendidas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-heading font-semibold text-white mb-2">5k+</div>
              <div className="text-sm text-text-secondary">spam bloqueado</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-heading font-semibold text-white mb-2">200+</div>
              <div className="text-sm text-text-secondary">negocios protegidos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-heading font-semibold text-white mb-2">1.5M+</div>
              <div className="text-sm text-text-secondary">minutos gestionados</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
