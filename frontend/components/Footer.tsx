import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-dark border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <div className="text-2xl font-heading font-bold text-white">
                ConsultIA
              </div>
            </Link>
            <p className="text-text-secondary text-sm leading-relaxed max-w-sm">
              Recepcionista AI para PYMEs españolas. De recepcionistas virtuales básicas a soluciones enterprise con white-label.
            </p>
            <div className="mt-6">
              <p className="text-text-secondary text-sm">
                Bilbao, España
              </p>
              <p className="text-text-secondary text-sm">
                soporte@consultia.es
              </p>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Producto</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/pricing" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Precios
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Características
                </Link>
              </li>
              <li>
                <Link href="/demo" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Demo
                </Link>
              </li>
            </ul>
          </div>

          {/* Industries */}
          <div>
            <h3 className="text-white font-semibold mb-4">Industrias</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/industries/clinicas" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Clínicas
                </Link>
              </li>
              <li>
                <Link href="/industries/veterinarias" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Veterinarias
                </Link>
              </li>
              <li>
                <Link href="/industries/peluquerias" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Peluquerías
                </Link>
              </li>
              <li>
                <Link href="/industries/talleres" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Talleres
                </Link>
              </li>
              <li>
                <Link href="/industries" className="text-primary hover:text-primary-600 text-sm transition-colors font-medium">
                  Ver todas →
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Recursos</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/blog" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-text-secondary hover:text-white text-sm transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Documentación
                </Link>
              </li>
            </ul>

            <h3 className="text-white font-semibold mb-4 mt-8">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-text-secondary hover:text-white text-sm transition-colors">
                  Términos
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-text-secondary text-sm">
              © 2026 ConsultIA. Todos los derechos reservados.
            </div>

            {/* Compliance Badges */}
            <div className="flex items-center gap-4">
              <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-text-secondary font-medium">
                🇪🇺 RGPD Compliant
              </div>
              <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-text-secondary font-medium">
                🔒 SSL Secure
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
