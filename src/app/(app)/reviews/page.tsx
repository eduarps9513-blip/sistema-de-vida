'use client'

import { useState, useEffect } from 'react'
import { LIFEBOOK_CATEGORIES, getCurrentWeekOfCycle } from '@/lib/utils'

type Cycle = { id: string; name: string; startDate: string; status: string; objectives: { id: string; name: string }[] }
type LifebookCat = { id: string; slug: string }
type WeeklyReview = { id: string; weekNumber: number; executionScore: number; whatWorked: string }
type MonthlyReview = { id: string; month: number; year: number; lifebookCategory: { slug: string }; notes: string }

export default function ReviewsPage() {
  const [tab, setTab] = useState<'weekly' | 'monthly' | 'closure'>('weekly')
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [categories, setCategories] = useState<LifebookCat[]>([])
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReview[]>([])
  const [monthlyReviews, setMonthlyReviews] = useState<MonthlyReview[]>([])
  const [selectedCycle, setSelectedCycle] = useState('')
  const [weeklyForm, setWeeklyForm] = useState({ whatWorked: '', whatDidntWork: '', whatIAdjust: '', whoIReport: '' })
  const [monthlyForm, setMonthlyForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), lifebookCategoryId: '', notes: '' })
  const [closureForm, setClosureForm] = useState({ cycleId: '', achievedResults: '', learnings: '', objectivesToRepeat: [] as string[], objectivesToDiscard: [] as string[] })
  const [closureResult, setClosureResult] = useState<{ autoSummary: string; executionPercent: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/cycles').then(r => r.json()).then(data => {
      setCycles(data)
      const active = data.find((c: Cycle) => c.status === 'ACTIVE')
      if (active) {
        setSelectedCycle(active.id)
        setClosureForm(f => ({ ...f, cycleId: active.id }))
      }
    })
    fetch('/api/lifebook').then(r => r.json()).then(setCategories)
    fetch('/api/reviews/monthly').then(r => r.json()).then(setMonthlyReviews)
  }, [])

  useEffect(() => {
    if (selectedCycle) {
      fetch(`/api/reviews/weekly?cycleId=${selectedCycle}`).then(r => r.json()).then(setWeeklyReviews)
    }
  }, [selectedCycle])

  const activeCycle = cycles.find(c => c.id === selectedCycle)
  const currentWeek = activeCycle ? getCurrentWeekOfCycle(activeCycle.startDate) : 1

  async function saveWeekly() {
    if (!selectedCycle) return
    const weekTactics = 0 // Will be computed server-side
    setSaving(true)
    const res = await fetch('/api/reviews/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleId: selectedCycle, weekNumber: currentWeek, ...weeklyForm, executionScore: weekTactics }),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('✓ Revisión semanal guardada')
      setTimeout(() => setMsg(''), 3000)
      fetch(`/api/reviews/weekly?cycleId=${selectedCycle}`).then(r => r.json()).then(setWeeklyReviews)
      setWeeklyForm({ whatWorked: '', whatDidntWork: '', whatIAdjust: '', whoIReport: '' })
    }
  }

  async function saveMonthly() {
    if (!monthlyForm.lifebookCategoryId) { setMsg('Selecciona una categoría'); return }
    setSaving(true)
    const res = await fetch('/api/reviews/monthly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(monthlyForm),
    })
    setSaving(false)
    if (res.ok) {
      setMsg('✓ Revisión mensual guardada')
      setTimeout(() => setMsg(''), 3000)
      fetch('/api/reviews/monthly').then(r => r.json()).then(setMonthlyReviews)
      setMonthlyForm(f => ({ ...f, notes: '' }))
    }
  }

  async function closeCycle() {
    if (!closureForm.cycleId) { setMsg('Selecciona un ciclo'); return }
    if (!confirm('¿Cerrar este ciclo? Esta acción no se puede deshacer.')) return
    setSaving(true)
    const res = await fetch(`/api/cycles/${closureForm.cycleId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(closureForm),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setClosureResult(data)
      setCycles(prev => prev.map(c => c.id === closureForm.cycleId ? { ...c, status: 'CLOSED' } : c))
    }
  }

  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const closureCycle = cycles.find(c => c.id === closureForm.cycleId)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📊</span>
          <h1 className="page-title">Revisiones</h1>
          {msg && <span className="badge-green ml-auto">{msg}</span>}
        </div>
        <p className="text-slate-400 text-sm">Ritual semanal, revisión mensual y cierre de ciclo.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-white/[0.03] rounded-xl w-fit">
        {([['weekly', '📝 Semanal'], ['monthly', '📅 Mensual'], ['closure', '🏁 Cierre de Ciclo']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={tab === key ? 'tab-active' : 'tab-inactive'}>
            {label}
          </button>
        ))}
      </div>

      {/* WEEKLY */}
      {tab === 'weekly' && (
        <div className="space-y-5">
          <div>
            <label className="label">Ciclo</label>
            <select value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)} className="input">
              <option value="">Seleccionar ciclo...</option>
              {cycles.map(c => <option key={c.id} value={c.id}>{c.name} {c.status === 'ACTIVE' ? '(Activo)' : ''}</option>)}
            </select>
          </div>

          {selectedCycle && (
            <div className="card border-violet-500/20 bg-violet-500/[0.04]">
              <p className="text-sm font-semibold text-violet-300 mb-4">
                Revisión Semana {currentWeek} de 12
              </p>
              {[
                ['whatWorked', '🟢 ¿Qué funcionó esta semana?'],
                ['whatDidntWork', '🔴 ¿Qué no funcionó?'],
                ['whatIAdjust', '🟡 ¿Qué ajusto la próxima semana?'],
                ['whoIReport', '👤 ¿A quién le reporto este avance?'],
              ].map(([key, label]) => (
                <div key={key} className="mb-4">
                  <label className="label">{label}</label>
                  <textarea
                    className="textarea w-full"
                    rows={3}
                    value={weeklyForm[key as keyof typeof weeklyForm]}
                    onChange={e => setWeeklyForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <button onClick={saveWeekly} disabled={saving} className="btn-primary w-full" id="save-weekly-review">
                {saving ? 'Guardando...' : '💾 Guardar Revisión Semanal'}
              </button>
            </div>
          )}

          {weeklyReviews.length > 0 && (
            <div>
              <h3 className="section-title mb-3">Historial de revisiones</h3>
              <div className="space-y-3">
                {weeklyReviews.map(r => (
                  <div key={r.id} className="card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">Semana {r.weekNumber}</span>
                      <span className={`badge ${r.executionScore >= 85 ? 'badge-green' : r.executionScore >= 60 ? 'badge-yellow' : 'badge-red'}`}>
                        {r.executionScore}%
                      </span>
                    </div>
                    {r.whatWorked && <p className="text-xs text-slate-400">✓ {r.whatWorked}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MONTHLY */}
      {tab === 'monthly' && (
        <div className="space-y-5">
          <div className="card border-violet-500/20 bg-violet-500/[0.04]">
            <p className="text-sm font-semibold text-violet-300 mb-4">Nueva Revisión Mensual</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label">Mes</label>
                <select value={monthlyForm.month} onChange={e => setMonthlyForm(f => ({ ...f, month: Number(e.target.value) }))} className="input">
                  {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Año</label>
                <input type="number" value={monthlyForm.year} onChange={e => setMonthlyForm(f => ({ ...f, year: Number(e.target.value) }))} className="input" />
              </div>
            </div>
            <div className="mb-4">
              <label className="label">Categoría Lifebook a revisar</label>
              <select value={monthlyForm.lifebookCategoryId} onChange={e => setMonthlyForm(f => ({ ...f, lifebookCategoryId: e.target.value }))} className="input">
                <option value="">Seleccionar categoría...</option>
                {LIFEBOOK_CATEGORIES.map(cat => {
                  const dbCat = categories.find(c => c.slug === cat.slug)
                  return dbCat ? <option key={cat.slug} value={dbCat.id}>{cat.icon} {cat.label}</option> : null
                })}
              </select>
            </div>
            <div className="mb-4">
              <label className="label">Notas de la revisión</label>
              <textarea className="textarea w-full" rows={4} placeholder="¿Qué observas en esta área? ¿Qué ajustas? ¿Qué celebras?" value={monthlyForm.notes} onChange={e => setMonthlyForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={saveMonthly} disabled={saving} className="btn-primary w-full">
              {saving ? 'Guardando...' : '💾 Guardar Revisión Mensual'}
            </button>
          </div>

          {monthlyReviews.length > 0 && (
            <div>
              <h3 className="section-title mb-3">Historial de revisiones mensuales</h3>
              <div className="space-y-3">
                {monthlyReviews.map(r => {
                  const cat = LIFEBOOK_CATEGORIES.find(c => c.slug === r.lifebookCategory?.slug)
                  return (
                    <div key={r.id} className="card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{monthNames[r.month - 1]} {r.year}</span>
                        {cat && <span className="badge badge-purple">{cat.icon} {cat.label}</span>}
                      </div>
                      {r.notes && <p className="text-xs text-slate-400">{r.notes}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CLOSURE */}
      {tab === 'closure' && (
        <div className="space-y-5">
          {closureResult ? (
            <div className="card border-emerald-500/30 bg-emerald-500/[0.06]">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🏆</span>
                <div>
                  <p className="font-bold text-emerald-300">¡Ciclo cerrado!</p>
                  <p className="text-sm text-slate-400">Ejecución: {closureResult.executionPercent}%</p>
                </div>
              </div>
              <div className="bg-white/[0.03] rounded-xl p-4 text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                {closureResult.autoSummary}
              </div>
              <button onClick={() => setClosureResult(null)} className="btn-secondary w-full mt-4">
                Cerrar otro ciclo
              </button>
            </div>
          ) : (
            <div className="card border-violet-500/20 bg-violet-500/[0.04]">
              <p className="text-sm font-semibold text-violet-300 mb-4">🏁 Cierre de Ciclo</p>

              <div className="mb-4">
                <label className="label">Seleccionar ciclo a cerrar</label>
                <select
                  value={closureForm.cycleId}
                  onChange={e => setClosureForm(f => ({ ...f, cycleId: e.target.value, objectivesToRepeat: [], objectivesToDiscard: [] }))}
                  className="input"
                >
                  <option value="">Seleccionar...</option>
                  {cycles.filter(c => c.status === 'ACTIVE').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {[
                ['achievedResults', '🏆 Resultados logrados', '¿Qué lograste concretamente en este ciclo?'],
                ['learnings', '💡 Aprendizajes clave', '¿Qué aprendiste? ¿Qué harías diferente?'],
              ].map(([key, label, ph]) => (
                <div key={key} className="mb-4">
                  <label className="label">{label}</label>
                  <textarea
                    className="textarea w-full"
                    rows={3}
                    placeholder={ph}
                    value={closureForm[key as 'achievedResults' | 'learnings']}
                    onChange={e => setClosureForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}

              {closureCycle && closureCycle.objectives.length > 0 && (
                <>
                  <div className="mb-4">
                    <label className="label">Objetivos a repetir en el próximo ciclo</label>
                    <div className="space-y-2">
                      {closureCycle.objectives.map(obj => (
                        <label key={obj.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={closureForm.objectivesToRepeat.includes(obj.id)}
                            onChange={e => setClosureForm(f => ({
                              ...f,
                              objectivesToRepeat: e.target.checked
                                ? [...f.objectivesToRepeat, obj.id]
                                : f.objectivesToRepeat.filter(id => id !== obj.id),
                              objectivesToDiscard: f.objectivesToDiscard.filter(id => id !== obj.id),
                            }))}
                            className="w-4 h-4 accent-emerald-500"
                          />
                          <span className="text-sm text-slate-300">🔄 {obj.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="label">Objetivos a descartar</label>
                    <div className="space-y-2">
                      {closureCycle.objectives.map(obj => (
                        <label key={obj.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={closureForm.objectivesToDiscard.includes(obj.id)}
                            onChange={e => setClosureForm(f => ({
                              ...f,
                              objectivesToDiscard: e.target.checked
                                ? [...f.objectivesToDiscard, obj.id]
                                : f.objectivesToDiscard.filter(id => id !== obj.id),
                              objectivesToRepeat: f.objectivesToRepeat.filter(id => id !== obj.id),
                            }))}
                            className="w-4 h-4 accent-red-500"
                          />
                          <span className="text-sm text-slate-300">🗑 {obj.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={closeCycle}
                disabled={saving || !closureForm.cycleId}
                className="btn-primary w-full"
                id="close-cycle-btn"
              >
                {saving ? 'Cerrando...' : '🏁 Cerrar Ciclo y Generar Resumen'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
