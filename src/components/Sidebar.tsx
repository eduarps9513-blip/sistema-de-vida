'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Hoy', icon: '🏠' },
  { href: '/cycles', label: 'Agenda', icon: '📅' },
  { href: '/vision', label: 'Visión', icon: '🔭' },
  { href: '/habits', label: 'Hábitos', icon: '⚡' },
  { href: '/lifebook', label: 'Lifebook', icon: '📖' },
  { href: '/study', label: 'Estudio', icon: '🧠' },
  { href: '/reviews', label: 'Revisiones', icon: '📊' },
  { href: '/settings', label: 'Ajustes', icon: '⚙️' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // Find active label for Mobile Top Header
  const activeNavItem = navItems.find((i) =>
    i.href === '/' ? pathname === '/' : pathname.startsWith(i.href)
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 h-full z-40 transition-all duration-300 border-r border-white/[0.06]"
        style={{
          width: collapsed ? '72px' : '240px',
          background: 'rgba(10, 15, 30, 0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-lg flex-shrink-0 shadow-lg shadow-violet-500/20">
            ✦
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white leading-none">Mi Sistema</p>
              <p className="text-xs text-slate-500 leading-none mt-0.5">de Vida</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
          >
            {collapsed ? '→' : '←'}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                }`}
              >
                <span className="text-lg flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/[0.06]">
          <div
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/30 to-blue-500/30 border border-violet-500/20 flex items-center justify-center text-sm font-semibold text-violet-300 flex-shrink-0">
              {session?.user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-medium text-slate-300 truncate">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-slate-500 hover:text-red-400 transition-colors text-xs p-1"
                  title="Cerrar sesión"
                >
                  ⏏
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Top Header App Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-slate-950/90 backdrop-blur-xl border-b border-white/[0.08] px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-violet-500/20">
            ✦
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">
              {activeNavItem ? `${activeNavItem.icon} ${activeNavItem.label}` : 'Mi Sistema de Vida'}
            </h2>
          </div>
        </div>

        <button
          onClick={() => setShowMoreMenu(true)}
          className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-300"
        >
          {session?.user?.name?.[0]?.toUpperCase() || 'U'}
        </button>
      </header>

      {/* Mobile Native Bottom Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl pb-safe"
        style={{ boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.5)' }}
      >
        <div className="flex items-center justify-around px-1 py-1.5">
          {navItems.slice(0, 4).map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'text-violet-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] tracking-tight">{item.label}</span>
                {isActive && (
                  <div className="w-4 h-1 rounded-full bg-violet-500 shadow-sm shadow-violet-400 mt-0.5" />
                )}
              </Link>
            )
          })}

          {/* More menu button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl transition-all duration-150 ${
              ['/lifebook', '/study', '/reviews', '/settings'].some((p) =>
                pathname.startsWith(p)
              )
                ? 'text-violet-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-xl leading-none">⋮</span>
            <span className="text-[10px] tracking-tight">Más</span>
          </button>
        </div>
      </nav>

      {/* Mobile Slide-Up Bottom Sheet Menu */}
      {showMoreMenu && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex flex-col justify-end transition-opacity"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="bg-slate-900 border-t border-white/10 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle Indicator */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2" />

            {/* Profile Header */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-base font-bold text-white shadow-md">
                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{session?.user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{session?.user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowMoreMenu(false)
                  signOut({ callbackUrl: '/login' })
                }}
                className="btn-danger btn-sm text-xs px-3 py-1.5"
              >
                ⏏ Salir
              </button>
            </div>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 p-3 rounded-xl text-xs font-semibold border transition-all ${
                      isActive
                        ? 'bg-violet-600/30 border-violet-500/40 text-white shadow-md shadow-violet-500/10'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            <button
              onClick={() => setShowMoreMenu(false)}
              className="btn-secondary w-full py-3 text-xs mt-2"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
