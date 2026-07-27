'use client'

import { SessionProvider } from 'next-auth/react'
import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main
          className="flex-1 min-h-screen main-content"
          style={{ marginLeft: 0, paddingLeft: 0 }}
        >
          {/* Offset for desktop sidebar and mobile header/bottom nav */}
          <div className="md:pl-[240px] transition-all duration-300">
            <div className="min-h-screen pt-16 md:pt-6 pb-24 md:pb-8 px-3.5 md:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SessionProvider>
  )
}
