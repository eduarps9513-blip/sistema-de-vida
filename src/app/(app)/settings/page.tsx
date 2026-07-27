'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'

type Settings = {
  dailyChecklistTime: string | null
  weeklyReviewDay: number | null
  weeklyReviewTime: string | null
  notificationsEnabled: boolean
  openaiApiKey: string | null
  aiPromptTemplate: string | null
}

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function SettingsPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<Settings>({
    dailyChecklistTime: '08:00',
    weeklyReviewDay: 0,
    weeklyReviewTime: '18:00',
    notificationsEnabled: true,
    openaiApiKey: null,
    aiPromptTemplate: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [openaiKeyInput, setOpenaiKeyInput] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) setSettings(data.settings)
        setLoading(false)
      })
  }, [])

  async function save(data: Partial<Settings> & { openaiApiKey?: string }) {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('✓ Guardado')
      setTimeout(() => setMsg(''), 3000)
    }
  }

  async function saveNotifications() {
    await save({
      dailyChecklistTime: settings.dailyChecklistTime,
      weeklyReviewDay: settings.weeklyReviewDay,
      weeklyReviewTime: settings.weeklyReviewTime,
      notificationsEnabled: settings.notificationsEnabled,
    })
  }

  async function saveAI() {
    const payload: Record<string, string | null> = {
      aiPromptTemplate: settings.aiPromptTemplate || '',
    }
    if (openaiKeyInput) {
      payload.openaiApiKey = openaiKeyInput
    }
    await save(payload)
    if (openaiKeyInput) {
      setOpenaiKeyInput('')
      setSettings(s => ({ ...s, openaiApiKey: '***configured***' }))
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="shimmer h-24 rounded-2xl" />
        <div className="shimmer h-48 rounded-2xl" />
        <div className="shimmer h-48 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⚙️</span>
          <h1 className="page-title">Configuración</h1>
          {msg && <span className="badge-green ml-auto">{msg}</span>}
        </div>
        <p className="text-slate-400 text-sm">Personaliza tu sistema</p>
      </div>

      <div className="space-y-5">
        {/* Profile section */}
        <div className="card">
          <h2 className="section-title mb-4">👤 Perfil</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.06]">
              <span className="text-sm text-slate-400">Nombre</span>
              <span className="text-sm text-slate-200">{session?.user?.name || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-400">Email</span>
              <span className="text-sm text-slate-200">{session?.user?.email || '—'}</span>
            </div>
          </div>
        </div>

        {/* AI section */}
        <div className="card">
          <h2 className="section-title mb-4">🤖 IA y Estudio</h2>
          <div className="space-y-4">
            <div>
              <label className="label">OpenAI API Key</label>
              {settings.openaiApiKey === '***configured***' && !showApiKey ? (
                <div className="flex gap-2">
                  <div className="input flex-1 text-emerald-400">✓ API Key configurada</div>
                  <button onClick={() => setShowApiKey(true)} className="btn-secondary btn-sm">Cambiar</button>
                </div>
              ) : (
                <input
                  type="password"
                  value={openaiKeyInput}
                  onChange={e => setOpenaiKeyInput(e.target.value)}
                  className="input"
                  placeholder="sk-..."
                  id="openai-api-key"
                />
              )}
              <p className="text-xs text-slate-600 mt-1">
                Necesaria para generar imágenes mentales y flashcards automáticamente. Se guarda de forma segura.
              </p>
            </div>

            <div>
              <label className="label">Plantilla de prompt (opcional)</label>
              <textarea
                className="textarea w-full"
                rows={4}
                value={settings.aiPromptTemplate || ''}
                onChange={e => setSettings(s => ({ ...s, aiPromptTemplate: e.target.value }))}
                placeholder="Deja vacío para usar el prompt predeterminado. El sistema pide: imagen mental memorable (máx 3 líneas) + pregunta de flashcard."
              />
            </div>

            <button onClick={saveAI} disabled={saving} className="btn-primary" id="save-ai-settings">
              {saving ? 'Guardando...' : '💾 Guardar Configuración IA'}
            </button>
          </div>
        </div>

        {/* Notifications section */}
        <div className="card">
          <h2 className="section-title mb-4">🔔 Recordatorios</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Hora del checklist diario</label>
                <input
                  type="time"
                  value={settings.dailyChecklistTime || '08:00'}
                  onChange={e => setSettings(s => ({ ...s, dailyChecklistTime: e.target.value }))}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Hora de revisión semanal</label>
                <input
                  type="time"
                  value={settings.weeklyReviewTime || '18:00'}
                  onChange={e => setSettings(s => ({ ...s, weeklyReviewTime: e.target.value }))}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Día de revisión semanal</label>
              <select
                value={settings.weeklyReviewDay ?? 0}
                onChange={e => setSettings(s => ({ ...s, weeklyReviewDay: Number(e.target.value) }))}
                className="input"
              >
                {DAY_NAMES.map((day, i) => (
                  <option key={i} value={i}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`relative w-12 h-6 rounded-full transition-colors ${settings.notificationsEnabled ? 'bg-violet-500' : 'bg-white/20'}`}
                  onClick={() => setSettings(s => ({ ...s, notificationsEnabled: !s.notificationsEnabled }))}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-slate-300">Notificaciones habilitadas</span>
              </label>
              <p className="text-xs text-slate-600 mt-1 ml-14">Notificaciones in-app. Las notificaciones push requieren navegador compatible.</p>
            </div>

            <button onClick={saveNotifications} disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : '💾 Guardar Recordatorios'}
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card border-red-500/20">
          <h2 className="section-title mb-4 text-red-400">⚠️ Cuenta</h2>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="btn-danger w-full"
            id="logout-btn"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  )
}
