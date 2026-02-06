'use client'

import Navigation from '@/components/Navigation'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import Pricing from '@/components/Pricing'
import FAQ from '@/components/FAQ'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-dark">
      <Navigation />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <FAQ />
      </main>
      <Footer />
    </div>
  )
}
