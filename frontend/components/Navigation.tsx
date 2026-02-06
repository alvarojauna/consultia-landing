'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { industries } from '../lib/industries'

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark/80 backdrop-blur-md border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="text-2xl font-heading font-bold text-white">
              ConsultIA
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/pricing"
              className="text-text-primary hover:text-white transition-colors text-sm font-medium"
            >
              Precios
            </Link>

            {/* Industries Dropdown */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-1 text-text-primary hover:text-white transition-colors text-sm font-medium">
                <span>Industrias</span>
                <ChevronDownIcon className="h-4 w-4" />
              </Menu.Button>
              <Menu.Items className="absolute left-0 mt-2 w-64 bg-dark-lighter border border-white/10 rounded-xl shadow-xl shadow-black/50 py-2 z-50">
                {industries.map((industry) => (
                  <Menu.Item key={industry.slug}>
                    {({ active }) => (
                      <Link
                        href={`/industries/${industry.slug}`}
                        className={`flex items-center space-x-3 px-4 py-3 text-sm transition-colors ${
                          active ? 'bg-white/5 text-white' : 'text-text-primary'
                        }`}
                      >
                        <industry.icon className="h-5 w-5 text-primary" />
                        <span>{industry.name}</span>
                      </Link>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Menu>

            <Link
              href="/blog"
              className="text-text-primary hover:text-white transition-colors text-sm font-medium"
            >
              Blog
            </Link>

            <Link
              href="/enterprise"
              className="text-text-primary hover:text-white transition-colors text-sm font-medium"
            >
              Enterprise
            </Link>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="text-text-primary hover:text-white transition-colors text-sm font-medium">
              Iniciar sesión
            </button>
            <button className="bg-primary hover:bg-primary-600 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/50">
              Empezar gratis
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-text-primary hover:text-white hover:bg-white/5 transition-colors"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-dark-lighter border-t border-white/10">
          <div className="px-4 py-6 space-y-4">
            <Link
              href="/pricing"
              className="block text-text-primary hover:text-white transition-colors py-2 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Precios
            </Link>

            {/* Mobile Industries Section */}
            <div className="space-y-2">
              <div className="text-text-primary py-2 font-medium text-sm">
                Industrias
              </div>
              <div className="pl-4 space-y-2">
                {industries.map((industry) => (
                  <Link
                    key={industry.slug}
                    href={`/industries/${industry.slug}`}
                    className="flex items-center space-x-2 text-text-secondary hover:text-white transition-colors py-2 text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <industry.icon className="h-4 w-4 text-primary" />
                    <span>{industry.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/blog"
              className="block text-text-primary hover:text-white transition-colors py-2 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </Link>

            <Link
              href="/enterprise"
              className="block text-text-primary hover:text-white transition-colors py-2 font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Enterprise
            </Link>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <button className="w-full text-left text-text-primary hover:text-white transition-colors py-2 font-medium">
                Iniciar sesión
              </button>
              <button className="w-full bg-primary hover:bg-primary-600 text-white px-6 py-3 rounded-full font-medium transition-all">
                Empezar gratis
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
