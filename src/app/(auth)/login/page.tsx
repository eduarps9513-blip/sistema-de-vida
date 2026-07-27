'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('eduarps9513@gmail.com')
  const [password, setPassword] = useState('12345678')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasUser, setHasUser] = useState<boolean | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => r.json())
      .then((d) => setHasUser(d.hasUser))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccessMsg('')
    const result = await signIn('credentials', {
      email: email.trim().toLowerCase(),
      password: password.trim(),
      redirect: false,
    })
    setLoading(false)
    if (result?.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Email o contraseña incorrectos. Si olvidaste tu contraseña, usa el botón de abajo para restablecerla.')
    }
  }

  async function handleResetPassword() {
    if (!newPassword.trim()) return
    setResetting(true)
    setError('')
    const res = await fetch('/api/auth/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password: newPassword.trim(),
      }),
    })
    setResetting(false)
    if (res.ok) {
      setPassword(newPassword.trim())
      setShowResetModal(false)
      setSuccessMsg('✓ ¡Contraseña actualizada! Ahora puedes Iniciar Sesión con tu nueva contraseña.')
      setNewPassword('')
    } else {
      setError('Error al cambiar contraseña')
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

          {successMsg && (
            <div className="alert-success mb-5">
              <span>✓</span>
              <span>{successMsg}</span>
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
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-xs text-violet-400 hover:text-violet-300 underline"
                >
                  Restablecer
                </button>
              </div>
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

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <button
              onClick={() => setShowResetModal(true)}
              className="btn-secondary text-xs w-full py-2.5"
            >
              🔑 ¿Olvidaste o quieres cambiar tu contraseña?
            </button>
          </div>
        </div>
      </div>

      {/* Reset Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowResetModal(false)}>
          <div className="modal-content max-w-sm">
            <div className="p-6 border-b border-white/[0.06]">
              <h3 className="text-base font-bold text-white">🔑 Restablecer Contraseña</h3>
              <p className="text-xs text-slate-400 mt-1">Escribe tu nueva contraseña para cambiarla de inmediato.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Correo</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Nueva Contraseña</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="ej. 12345678"
                  className="input"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowResetModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={handleResetPassword}
                  disabled={resetting || !newPassword.trim()}
                  className="btn-primary flex-1"
                >
                  {resetting ? 'Guardando...' : 'Restablecer ✓'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
