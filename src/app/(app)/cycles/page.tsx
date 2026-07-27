'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate, getCurrentWeekOfCycle } from '@/lib/utils'

type WeeklyTactic = { id: string; weekNumber: number; completed: boolean }
type Objective = { id: string; name: string; weeklyTactics: WeeklyTactic[] }
type Cycle = {
  id: string
  name: string
  startDate: string
  endDate: string
  totalWeeks?: number
  status: string
  objectives: Objective[]
}

function calcExecution(objectives: Objective[]) {
  const all = objectives.flatMap((o) => o.weeklyTactics)
  if (!all.length) return 0
  return Math.round((all.filter((t) => t.completed).length / all.length) * 100)
}

function calculateWeeksAndDays(startDateStr: string, endDateStr: string) {
  if (!startDateStr || !endDateStr) return null
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return null

  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const weeks = Math.max(1, Math.min(12, Math.ceil(days / 7)))
  return { days, weeks }
}

export default function AgendaPage() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' })
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/cycles')
      .then((r) => r.json())
      .then((data) => {
        setCycles(data)
        setLoading(false)
      })
  }, [])

  const calcInfo = calculateWeeksAndDays(form.startDate, form.endDate)

  function setPresetDurationWeeks(numWeeks: number) {
    if (!form.startDate) return
    const start = new Date(form.startDate)
    if (isNaN(start.getTime())) return
    const end = new Date(start)
    end.setDate(end.getDate() + numWeeks * 7 - 1)
    const year = end.getFullYear()
    const month = String(end.getMonth() + 1).padStart(2, '0')
    const day = String(end.getDate()).padStart(2, '0')
    setForm((f) => ({ ...f, endDate: `${year}-${month}-${day}` }))
  }

  async function createCycle() {
    if (!form.name || !form.startDate) {
      setError('Nombre y fecha de inicio son requeridos')
      return
    }
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          totalWeeks: calcInfo?.weeks || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCycles((prev) => [data, ...prev])
        setShowModal(false)
        setForm({ name: '', startDate: '', endDate: '' })
      } else {
        setError(data.error || 'Error al crear el ciclo en la agenda')
      }
    } catch {
      setError('Error de conexión al guardar')
    } finally {
      setCreating(false)
    }
  }

  async function deleteCycle(e: React.MouseEvent, cycleId: string, cycleName: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`¿Estás seguro de eliminar el ciclo "${cycleName}" y todos sus objetivos?`)) return

    setDeletingId(cycleId)
    try {
      const res = await fetch(`/api/cycles/${cycleId}`, { method: 'DELETE' })
      if (res.ok) {
        setCycles((prev) => prev.filter((c) => c.id !== cycleId))
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📅</span>
            <h1 className="page-title">Agenda y Ciclos de Ejecución</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Gestiona tus ciclos de ejecución, ajusta su duración y elimina ciclos antiguos cuando sea necesario.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex-shrink-0"
          id="new-cycle-btn"
        >
          + Nuevo Ciclo en Agenda
        </button>
      </div>

      {/* Methodology note */}
      <div className="alert-info mb-6">
        <span>💡</span>
        <p className="text-sm">
          <strong>Agenda & Ciclos:</strong> Cada ciclo agrupa tus objetivos y tácticas. Puedes abrir cualquier ciclo para gestionarlo o eliminarlo si ya no lo necesitas.
        </p>
      </div>

      {/* Cycles list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="shimmer h-40 rounded-2xl" />)}
        </div>
      ) : cycles.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-4">📅</p>
          <p className="text-slate-300 font-semibold text-lg">No hay ciclos en tu Agenda</p>
          <p className="text-slate-500 text-sm mt-2 mb-6">
            Crea tu primer ciclo estableciendo fechas para calcular automáticamente tus semanas
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            + Crear Primer Ciclo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => {
            const isActive = cycle.status === 'ACTIVE'
            const weeksTotal = cycle.totalWeeks || 12
            const currentWeek = isActive ? Math.min(weeksTotal, getCurrentWeekOfCycle(cycle.startDate)) : weeksTotal
            const daysLeft = isActive
              ? Math.max(0, Math.ceil((new Date(cycle.endDate).getTime() - Date.now()) / 86400000))
              : 0
            const execution = calcExecution(cycle.objectives)

            return (
              <Link key={cycle.id} href={`/cycles/${cycle.id}`}>
                <div className={`card hover:scale-[1.01] transition-all cursor-pointer ${isActive ? 'border-violet-500/20 bg-violet-500/[0.04]' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-100">{cycle.name}</h3>
                        <span className={`badge ${isActive ? 'badge-green' : 'badge-blue'}`} style={!isActive ? {background:'rgba(100,116,139,0.1)', color:'#94a3b8', border:'1px solid rgba(100,116,139,0.2)'} : {}}>
                          {isActive ? '● Activo' : '✓ Cerrado'}
                        </span>
                        <span className="badge badge-purple">{weeksTotal} semana{weeksTotal !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${execution >= 85 ? 'text-emerald-400' : execution >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                        {execution}%
                      </p>
                      <p className="text-xs text-slate-500">ejecución</p>
                    </div>
                  </div>

                  {/* DUAL PROGRESS BARS FOR CYCLE */}
                  <div className="space-y-2.5 my-3 pt-3 border-t border-white/[0.04]">
                    {/* BAR 1: Time Progress */}
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>⏳ <strong>Tiempo:</strong> Semana {currentWeek} de {weeksTotal}</span>
                        <span>{daysLeft} días restantes</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill bg-blue-500/80"
                          style={{ width: `${(currentWeek / weeksTotal) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* BAR 2: Tactics Task Progress */}
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>✅ <strong>Tácticas (Ejecución):</strong></span>
                        <span>{cycle.objectives.flatMap(o => o.weeklyTactics).filter(t => t.completed).length}/{cycle.objectives.flatMap(o => o.weeklyTactics).length} completadas ({execution}%)</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${execution >= 85 ? 'bg-emerald-400' : execution >= 60 ? 'bg-amber-400' : 'bg-violet-500'}`}
                          style={{ width: `${execution}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>📋 {cycle.objectives.length} objetivo{cycle.objectives.length !== 1 ? 's' : ''}</span>
                    {isActive && <span>⏰ Semana {currentWeek}/{weeksTotal}</span>}

                    <div className="ml-auto flex items-center gap-3">
                      <button
                        onClick={(e) => deleteCycle(e, cycle.id, cycle.name)}
                        disabled={deletingId === cycle.id}
                        className="btn-ghost btn-sm text-slate-500 hover:text-red-400 text-xs px-2 py-1 flex items-center gap-1"
                        title="Eliminar este ciclo"
                      >
                        🗑 Eliminar
                      </button>
                      <span className="text-violet-400 text-sm">Abrir Agenda →</span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="p-6 border-b border-white/[0.06]">
              <h2 className="text-lg font-bold text-white">Nuevo Ciclo en Agenda</h2>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa la fecha de inicio y final para calcular el número de semanas automáticamente.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nombre del ciclo *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input"
                  placeholder="ej. Sprint Q1 — Lanzamiento de producto"
                  id="cycle-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fecha de inicio *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="input"
                    id="cycle-start-date"
                  />
                </div>
                <div>
                  <label className="label">Fecha de finalización *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="input"
                    id="cycle-end-date"
                  />
                </div>
              </div>

              {/* Quick duration presets */}
              {form.startDate && (
                <div>
                  <label className="label text-[11px] text-slate-400 mb-1">Opciones rápidas de fecha de fin:</label>
                  <div className="flex gap-2 flex-wrap">
                    {[4, 6, 8, 12].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setPresetDurationWeeks(w)}
                        className="btn-ghost btn-sm text-xs bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1 text-slate-300"
                      >
                        + {w} semanas
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Automatic week calculation display */}
              {calcInfo ? (
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center gap-3">
                  <span className="text-xl">📊</span>
                  <div>
                    <p className="text-xs font-bold text-violet-300">
                      Duración calculada: {calcInfo.weeks} semana{calcInfo.weeks !== 1 ? 's' : ''} ({calcInfo.days} días)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      El sistema organizará tus objetivos y tareas en {calcInfo.weeks} semanas completas.
                    </p>
                  </div>
                </div>
              ) : form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate) ? (
                <div className="alert-danger">
                  <span>⚠️</span>
                  <span>La fecha de finalización debe ser posterior a la fecha de inicio</span>
                </div>
              ) : null}

              {error && <div className="alert-danger"><span>⚠️</span><span>{error}</span></div>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={createCycle}
                  disabled={creating || !form.name || !form.startDate || !form.endDate}
                  className="btn-primary flex-1"
                  id="create-cycle-submit"
                >
                  {creating ? 'Creando...' : 'Crear Ciclo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
