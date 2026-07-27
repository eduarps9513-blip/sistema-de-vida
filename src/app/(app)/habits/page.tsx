'use client'

import { useState, useEffect } from 'react'
import { getTodayString } from '@/lib/utils'

type HabitLog = { id: string; date: string; completed: boolean }
type Habit = {
  id: string
  name: string
  scheduledTime: string
  location: string
  stackedAfter: string | null
  makeItObvious: string
  makeItAttractive: string
  makeItEasy: string
  makeItSatisfying: string
  startWeek: number
  status: string
  logs: HabitLog[]
}

function calcStreak(logs: HabitLog[]): number {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  let streak = 0
  const today = getTodayString()
  let current = today

  for (const log of sorted) {
    if (log.date === current && log.completed) {
      streak++
      const d = new Date(current)
      d.setDate(d.getDate() - 1)
      current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    } else if (log.date === current && !log.completed) {
      break
    }
  }
  return streak
}

function getLast14Days(): string[] {
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return days
}

const STATUS_OPTIONS = ['ACTIVE', 'PAUSED', 'ABANDONED']
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Activo', PAUSED: 'Pausado', ABANDONED: 'Abandonado' }
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'badge-green',
  PAUSED: 'badge-yellow',
  ABANDONED: 'badge-red',
}

const emptyForm = {
  name: '',
  scheduledTime: '',
  location: '',
  stackedAfter: '',
  makeItObvious: '',
  makeItAttractive: '',
  makeItEasy: '',
  makeItSatisfying: '',
  startWeek: 1,
  status: 'ACTIVE',
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [activeStatus, setActiveStatus] = useState('ACTIVE')
  const today = getTodayString()

  useEffect(() => {
    fetch('/api/habits')
      .then((r) => r.json())
      .then((data) => { setHabits(data); setLoading(false) })
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(habit: Habit) {
    setEditing(habit)
    setForm({
      name: habit.name,
      scheduledTime: habit.scheduledTime,
      location: habit.location,
      stackedAfter: habit.stackedAfter || '',
      makeItObvious: habit.makeItObvious,
      makeItAttractive: habit.makeItAttractive,
      makeItEasy: habit.makeItEasy,
      makeItSatisfying: habit.makeItSatisfying,
      startWeek: habit.startWeek,
      status: habit.status,
    })
    setShowModal(true)
  }

  async function saveHabit() {
    if (!form.name) return
    setSaving(true)
    if (editing) {
      const res = await fetch(`/api/habits/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const updated = await res.json()
      setHabits((prev) => prev.map((h) => h.id === editing.id ? updated : h))
    } else {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const created = await res.json()
      setHabits((prev) => [...prev, created])
    }
    setSaving(false)
    setShowModal(false)
  }

  async function deleteHabit(id: string) {
    if (!confirm('¿Eliminar este hábito?')) return
    await fetch(`/api/habits/${id}`, { method: 'DELETE' })
    setHabits((prev) => prev.filter((h) => h.id !== id))
  }

  const filtered = habits.filter((h) => h.status === activeStatus)
  const days14 = getLast14Days()

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">⚡</span>
            <h1 className="page-title">Hábitos</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Fórmula de implementación: cuándo, dónde y a qué se apila cada hábito.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex-shrink-0" id="new-habit-btn">
          + Nuevo Hábito
        </button>
      </div>

      {/* Methodology note */}
      <div className="alert-info mb-6">
        <span>💡</span>
        <p className="text-sm">
          <strong>Hábitos Atómicos — James Clear:</strong> Las 4 leyes del cambio de comportamiento: hazlo obvio,
          hazlo atractivo, hazlo fácil, hazlo satisfactorio.
        </p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-6 p-1 bg-white/[0.03] rounded-xl w-fit">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setActiveStatus(s)}
            className={activeStatus === s ? 'tab-active' : 'tab-inactive'}
          >
            {STATUS_LABELS[s]} ({habits.filter((h) => h.status === s).length})
          </button>
        ))}
      </div>

      {/* Habits list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="shimmer h-28 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">⚡</p>
          <p className="text-slate-400">No hay hábitos en este estado</p>
          {activeStatus === 'ACTIVE' && (
            <button onClick={openCreate} className="btn-primary mt-4">+ Crear Primer Hábito</button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((habit) => {
            const streak = calcStreak(habit.logs)
            const todayLog = habit.logs.find((l) => l.date === today)

            return (
              <div key={habit.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-100">{habit.name}</h3>
                      <span className={`badge ${STATUS_COLORS[habit.status]}`}>{STATUS_LABELS[habit.status]}</span>
                    </div>
                    <div className="flex gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      {habit.scheduledTime && <span>🕐 {habit.scheduledTime}</span>}
                      {habit.location && <span>📍 {habit.location}</span>}
                      {habit.stackedAfter && <span>🔗 Después de: {habit.stackedAfter}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {streak > 0 && (
                      <div className="text-center">
                        <p className="text-lg font-bold text-amber-400">🔥{streak}</p>
                        <p className="text-xs text-slate-600">racha</p>
                      </div>
                    )}
                    <button onClick={() => openEdit(habit)} className="btn-ghost btn-sm">✏️</button>
                    <button onClick={() => deleteHabit(habit.id)} className="btn-danger btn-sm">🗑</button>
                  </div>
                </div>

                {/* 4 Laws (if filled) */}
                {(habit.makeItObvious || habit.makeItAttractive || habit.makeItEasy || habit.makeItSatisfying) && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      ['makeItObvious', '👁 Obvio', habit.makeItObvious],
                      ['makeItAttractive', '✨ Atractivo', habit.makeItAttractive],
                      ['makeItEasy', '🎯 Fácil', habit.makeItEasy],
                      ['makeItSatisfying', '🏆 Satisfactorio', habit.makeItSatisfying],
                    ].map(([, label, val]) =>
                      val ? (
                        <div key={label} className="text-xs text-slate-500 bg-white/[0.03] rounded-lg p-2">
                          <span className="text-slate-400 font-medium">{label}:</span> {val}
                        </div>
                      ) : null
                    )}
                  </div>
                )}

                {/* 14-day history dots */}
                <div className="flex gap-1 flex-wrap">
                  {days14.map((d) => {
                    const log = habit.logs.find((l) => l.date === d)
                    return (
                      <div
                        key={d}
                        title={d}
                        className={`w-5 h-5 rounded-md ${
                          log?.completed
                            ? 'bg-emerald-400'
                            : log
                            ? 'bg-red-400/50'
                            : 'bg-white/[0.06]'
                        }`}
                      />
                    )
                  })}
                  <span className="text-xs text-slate-600 self-center ml-1">14 días</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/[0.06]">
              <h2 className="text-lg font-bold text-white">{editing ? 'Editar Hábito' : 'Nuevo Hábito'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nombre del hábito *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input"
                  placeholder="ej. Meditar 10 minutos"
                  id="habit-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Hora específica</label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Semana de arranque</label>
                  <input
                    type="number"
                    min={1} max={12}
                    value={form.startWeek}
                    onChange={(e) => setForm((f) => ({ ...f, startWeek: Number(e.target.value) }))}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Lugar específico</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="input"
                  placeholder="ej. En mi escritorio, en la sala..."
                />
              </div>

              <div>
                <label className="label">Habit stacking (después de qué hábito)</label>
                <input
                  type="text"
                  value={form.stackedAfter}
                  onChange={(e) => setForm((f) => ({ ...f, stackedAfter: e.target.value }))}
                  className="input"
                  placeholder="ej. Después de tomar café"
                />
              </div>

              <div className="divider" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Las 4 Leyes del Cambio</p>

              {[
                ['makeItObvious', '👁 Hazlo obvio', 'ej. Poner el libro en la almohada'],
                ['makeItAttractive', '✨ Hazlo atractivo', 'ej. Escuchar mi podcast favorito mientras hago ejercicio'],
                ['makeItEasy', '🎯 Hazlo fácil', 'ej. Ropa lista la noche anterior'],
                ['makeItSatisfying', '🏆 Hazlo satisfactorio', 'ej. Marcar en mi tracker, recompensa'],
              ].map(([key, label, ph]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    type="text"
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="input"
                    placeholder={ph}
                  />
                </div>
              ))}

              {editing && (
                <div>
                  <label className="label">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="input"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={saveHabit}
                  disabled={saving || !form.name}
                  className="btn-primary flex-1"
                  id="save-habit-btn"
                >
                  {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear Hábito'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
