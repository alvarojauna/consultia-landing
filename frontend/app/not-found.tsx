import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-primary mb-4">404</p>
        <h1 className="text-2xl font-heading font-bold text-white mb-2">
          Pagina no encontrada
        </h1>
        <p className="text-text-secondary mb-6">
          La pagina que buscas no existe o ha sido movida.
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
