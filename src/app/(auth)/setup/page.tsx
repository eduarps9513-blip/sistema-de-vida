'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SetupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => {
        if (d.hasUser) router.push('/login')
      })
  }, [router])

  function setField(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Error al configurar el sistema')
      setLoading(false)
      return
    }

    // Auto sign in after setup
    await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    router.push('/')
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-3xl shadow-2xl shadow-violet-500/30 mb-4">
            ✦
          </div>
          <h1 className="text-2xl font-bold text-white">Configura Tu Sistema</h1>
          <p className="text-slate-400 text-sm mt-1">Solo necesitas 1 minuto para empezar</p>
        </div>

        <div className="glass rounded-2xl p-8">
          {/* Welcome steps */}
          <div className="mb-6 space-y-2">
            {[
              { icon: '🔭', label: 'Escribe tu visión 3 y 5 años' },
              { icon: '📖', label: 'Completa tu Lifebook' },
              { icon: '🔄', label: 'Crea tu primer ciclo de 12 semanas' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                <span>{step.icon}</span>
                <span>{step.label}</span>
              </div>
            ))}
          </div>

          <div className="divider" />

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="label">Nombre completo</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className="input"
                placeholder="Tu nombre"
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                className="input"
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField('password', e.target.value)}
                className="input"
                placeholder="Mínimo 6 caracteres"
                required
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="label">Confirmar contraseña</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setField('confirm', e.target.value)}
                className="input"
                placeholder="••••••"
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="alert-danger">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              id="setup-submit"
              className="btn-primary w-full btn-lg mt-2"
            >
              {loading ? 'Configurando tu sistema...' : 'Crear Mi Sistema de Vida →'}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
