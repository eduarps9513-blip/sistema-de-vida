'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasUser, setHasUser] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => setHasUser(d.hasUser))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (result?.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Email o contraseña incorrectos')
    }
  }

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 text-3xl shadow-2xl shadow-violet-500/30 mb-4">
            ✦
          </div>
          <h1 className="text-2xl font-bold text-white">Mi Sistema de Vida</h1>
          <p className="text-slate-400 text-sm mt-1">Tu sistema integrado de productividad y crecimiento personal</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          {hasUser === false && (
            <div className="alert-info mb-6">
              <span>ℹ️</span>
              <div>
                <p className="font-medium">Primera vez aquí</p>
                <Link href="/setup" className="text-blue-300 hover:text-blue-200 underline">
                  Crear tu cuenta →
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••"
                required
                autoComplete="current-password"
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
              id="login-submit"
              className="btn-primary w-full btn-lg mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    style={{ animation: 'spin 0.8s linear infinite' }}
                  />
                  Entrando...
                </span>
              ) : (
                'Iniciar Sesión →'
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-xs mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/setup" className="text-violet-400 hover:text-violet-300">
              Configurar sistema
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
