import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Mi Sistema de Vida',
    template: '%s | Mi Sistema de Vida',
  },
  description: 'Tu sistema integrado de productividad y desarrollo personal: 12 Week Year, Lifebook, Hábitos Atómicos y estudio acelerado con IA.',
  keywords: ['productividad', 'hábitos', '12 week year', 'lifebook', 'desarrollo personal'],
  robots: 'noindex, nofollow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0f1e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-mesh min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
