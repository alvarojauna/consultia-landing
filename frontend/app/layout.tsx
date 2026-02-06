import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Urbanist } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const urbanist = Urbanist({
  subsets: ['latin'],
  variable: '--font-urbanist',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ConsultIA - Recepcionista AI Para PYMEs Españolas',
  description: 'El servicio de recepcionista AI que atiende 24/7, agenda citas y filtra spam. Todo en español y con números +34.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={`${inter.variable} ${urbanist.variable}`}>
      <body>{children}</body>
    </html>
  )
}
