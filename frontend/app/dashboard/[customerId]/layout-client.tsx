'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import {
  HomeIcon,
  PhoneIcon,
  CogIcon,
  CreditCardIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const navItems = [
  { label: 'Resumen', icon: HomeIcon, path: '' },
  { label: 'Llamadas', icon: PhoneIcon, path: '/calls' },
  { label: 'Agente', icon: CogIcon, path: '/agent' },
  { label: 'Facturación', icon: CreditCardIcon, path: '/billing' },
]

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const customerId = params.customerId as string
  const basePath = `/dashboard/${customerId}`
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-dark">
      {/* Top header */}
      <header className="border-b border-white/5 bg-dark sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-dark-lighter text-text-secondary"
            >
              {sidebarOpen ? <XMarkIcon className="w-5 h-5" /> : <Bars3Icon className="w-5 h-5" />}
            </button>
            <Link href="/" className="text-xl font-heading font-bold text-white">
              Consult<span className="text-primary">IA</span>
            </Link>
          </div>
          <span className="text-sm text-text-muted">Dashboard</span>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-[53px] left-0 z-20 h-[calc(100vh-53px)]
            w-56 bg-dark-lighter border-r border-white/5 p-4
            transition-transform lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <nav className="space-y-1">
            {navItems.map((item) => {
              const href = `${basePath}${item.path}`
              const isActive =
                item.path === ''
                  ? pathname === basePath
                  : pathname.startsWith(href)

              return (
                <Link
                  key={item.path}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-secondary hover:bg-dark-light hover:text-white'}
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
