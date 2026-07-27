'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate, getCurrentWeekOfCycle, LIFEBOOK_CATEGORIES, getTodayString, getWeekDateRange } from '@/lib/utils'

type WeeklyTactic = { id: string; weekNumber: number; description: string; completed: boolean }
type LifebookCategory = { id: string; slug: string }
type Objective = {
  id: string
  name: string
  lagMeasure: string
  leadMeasure: string
  linkedVision3: boolean
  linkedVision5: boolean
  lifebookCategoryId: string | null
  lifebookCategory: LifebookCategory | null
  weeklyTactics: WeeklyTactic[]
}
type WeeklyReview = {
  id: string
  weekNumber: number
  whatWorked: string
  whatDidntWork: string
  whatIAdjust: string
  whoIReport: string
  executionScore: number
}
type Cycle = {
  id: string
  name: string
  startDate: string
  endDate: string
  totalWeeks?: number
  status: string
  objectives: Objective[]
  weeklyReviews: WeeklyReview[]
  closure: { autoSummary: string; executionPercent: number } | null
}

export default function CycleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [cycle, setCycle] = useState<Cycle | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedObj, setExpandedObj] = useState<string | null>(null)
  const [showAddObj, setShowAddObj] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [addingToDay, setAddingToDay] = useState<string | null>(null)
  const [addedMsg, setAddedMsg] = useState('')

  // New Tactic input state per week: { [objectiveId_weekNumber]: string }
  const [newTacticInputs, setNewTacticInputs] = useState<Record<string, string>>({})
  const [addingTacticKey, setAddingTacticKey] = useState<string | null>(null)

  const [objForm, setObjForm] = useState({
    name: '',
    lagMeasure: '',
    leadMeasure: '',
    lifebookCategoryId: '',
    linkedVision3: false,
    linkedVision5: false,
  })
  const [reviewForm, setReviewForm] = useState({
    whatWorked: '',
    whatDidntWork: '',
    whatIAdjust: '',
    whoIReport: '',
  })
  const [creating, setCreating] = useState(false)
  const [objError, setObjError] = useState('')
  const [activeTab, setActiveTab] = useState<'objectives' | 'weekly_plan' | 'scorecard' | 'reviews'>('objectives')
  const [selectedWeekView, setSelectedWeekView] = useState<number>(1)

  // Drag and drop state for moving tactics between weeks
  const [draggedTacticId, setDraggedTacticId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [addedToDailyMap, setAddedToDailyMap] = useState<Record<string, boolean>>({})

  async function moveTacticToWeek(tacticId: string, targetWeekNumber: number) {
    setCycle((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        objectives: prev.objectives.map((o) => ({
          ...o,
          weeklyTactics: o.weeklyTactics.map((t) => (t.id === tacticId ? { ...t, weekNumber: targetWeekNumber } : t)),
        })),
      }
    })

    await fetch('/api/tactics', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tacticId, weekNumber: targetWeekNumber }),
    })
  }

  const loadCycle = useCallback(async () => {
    const todayStr = getTodayString()
    const [resCycle, resTasks] = await Promise.all([
      fetch(`/api/cycles/${id}`),
      fetch(`/api/daily-tasks?date=${todayStr}`),
    ])

    if (resCycle.ok) {
      const data = await resCycle.json()
      setCycle(data)
      if (data) {
        setSelectedWeekView(Math.min(data.totalWeeks || 12, getCurrentWeekOfCycle(data.startDate)))
      }
    }

    if (resTasks.ok) {
      const tasks = await resTasks.json()
      const map: Record<string, boolean> = {}
      tasks.forEach((t: { sourceType?: string; sourceId?: string }) => {
        if (t.sourceType === 'TACTIC' && t.sourceId) {
          map[t.sourceId] = true
        }
      })
      setAddedToDailyMap(map)
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    loadCycle()
  }, [loadCycle])

  const weeksTotal = cycle?.totalWeeks || 12
  const currentWeek = cycle ? Math.min(weeksTotal, getCurrentWeekOfCycle(cycle.startDate)) : 1
  const allTactics = cycle?.objectives.flatMap((o) => o.weeklyTactics) ?? []
  const executionPct =
    allTactics.length > 0
      ? Math.round((allTactics.filter((t) => t.completed).length / allTactics.length) * 100)
      : 0

  // Calculate Time Progress Percentage for Cycle
  const calcTimeProgress = () => {
    if (!cycle) return { elapsedDays: 0, totalDays: 1, timePct: 0 }
    const start = new Date(cycle.startDate).getTime()
    const end = new Date(cycle.endDate).getTime()
    const now = Date.now()
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))
    const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((now - start) / (1000 * 60 * 60 * 24))))
    const timePct = Math.round((elapsedDays / totalDays) * 100)
    return { elapsedDays, totalDays, timePct }
  }

  const { elapsedDays, totalDays, timePct } = calcTimeProgress()

  async function addObjective() {
    if (!objForm.name) { setObjError('El nombre del objetivo es requerido'); return }
    setCreating(true)
    setObjError('')
    try {
      const res = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId: id, ...objForm }),
      })
      const data = await res.json()
      if (res.ok) {
        setCycle((prev) => prev ? { ...prev, objectives: [...prev.objectives, data] } : prev)
        setShowAddObj(false)
        setObjForm({ name: '', lagMeasure: '', leadMeasure: '', lifebookCategoryId: '', linkedVision3: false, linkedVision5: false })
      } else {
        setObjError(data.error || 'Error al crear el objetivo')
      }
    } catch {
      setObjError('Error de red al procesar la solicitud')
    } finally {
      setCreating(false)
    }
  }

  async function deleteObjective(objId: string) {
    if (!confirm('¿Eliminar este objetivo y todas sus tácticas?')) return
    await fetch('/api/objectives', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: objId }),
    })
    setCycle((prev) =>
      prev ? { ...prev, objectives: prev.objectives.filter((o) => o.id !== objId) } : prev
    )
  }

  async function addTacticToWeek(objectiveId: string, weekNumber: number) {
    const key = `${objectiveId}_${weekNumber}`
    const text = (newTacticInputs[key] || '').trim()
    if (!text) return
    setAddingTacticKey(key)

    const res = await fetch('/api/tactics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objectiveId, weekNumber, description: text }),
    })
    const createdTactic = await res.json()
    setAddingTacticKey(null)

    if (res.ok) {
      setNewTacticInputs((prev) => ({ ...prev, [key]: '' }))
      setCycle((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          objectives: prev.objectives.map((o) =>
            o.id === objectiveId
              ? { ...o, weeklyTactics: [...o.weeklyTactics, createdTactic] }
              : o
          ),
        }
      })
    }
  }

  async function updateTactic(tacticId: string, field: 'description' | 'completed', value: string | boolean) {
    await fetch('/api/tactics', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tacticId, [field]: value }),
    })
    setCycle((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        objectives: prev.objectives.map((o) => ({
          ...o,
          weeklyTactics: o.weeklyTactics.map((t) =>
            t.id === tacticId ? { ...t, [field]: value } : t
          ),
        })),
      }
    })
  }

  async function deleteTactic(tacticId: string, objectiveId: string) {
    await fetch('/api/tactics', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tacticId }),
    })
    setCycle((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        objectives: prev.objectives.map((o) =>
          o.id === objectiveId
            ? { ...o, weeklyTactics: o.weeklyTactics.filter((t) => t.id !== tacticId) }
            : o
        ),
      }
    })
  }

  async function sendToDailyAgenda(tacticDescription: string, tacticId: string, targetDate?: string) {
    setAddingToDay(tacticId)
    const date = targetDate || getTodayString()
    const res = await fetch('/api/daily-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: tacticDescription,
        date,
        sourceType: 'TACTIC',
        sourceId: tacticId,
      }),
    })
    setAddingToDay(null)
    if (res.ok) {
      setAddedToDailyMap((prev) => ({ ...prev, [tacticId]: true }))
      setAddedMsg(`✓ Tarea añadida a la Agenda del Día (${date === getTodayString() ? 'Hoy' : 'Mañana'})`)
      setTimeout(() => setAddedMsg(''), 3000)
    }
  }

  async function saveWeeklyReview() {
    const weekTactics = cycle?.objectives.flatMap((o) =>
      o.weeklyTactics.filter((t) => t.weekNumber === currentWeek)
    ) ?? []
    const score =
      weekTactics.length > 0
        ? Math.round((weekTactics.filter((t) => t.completed).length / weekTactics.length) * 100)
        : 0

    await fetch('/api/reviews/weekly', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycleId: id, weekNumber: currentWeek, ...reviewForm, executionScore: score }),
    })
    setShowReview(false)
    loadCycle()
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="shimmer h-32 rounded-2xl" />
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    )
  }

  if (!cycle) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Ciclo no encontrado</p>
        <Link href="/cycles" className="btn-secondary mt-4 inline-flex">← Volver a Agenda</Link>
      </div>
    )
  }

  const isActive = cycle.status === 'ACTIVE'
  const daysLeft = Math.max(0, Math.ceil((new Date(cycle.endDate).getTime() - Date.now()) / 86400000))

  // Rollover tactics: incomplete tactics from weeks prior to selectedWeekView or currentWeek
  const pendingPastTactics: { objectiveName: string; tactic: WeeklyTactic }[] = []
  if (cycle) {
    cycle.objectives.forEach((obj) => {
      obj.weeklyTactics.forEach((t) => {
        if (!t.completed && t.description.trim() !== '' && t.weekNumber < selectedWeekView) {
          pendingPastTactics.push({ objectiveName: obj.name, tactic: t })
        }
      })
    })
  }

  async function deleteCurrentCycle() {
    if (!cycle) return
    if (!confirm(`¿Eliminar el ciclo "${cycle.name}" y todos sus objetivos permanentemente?`)) return
    const res = await fetch(`/api/cycles/${cycle.id}`, { method: 'DELETE' })
    if (res.ok) {
      window.location.href = '/cycles'
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back & Delete */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/cycles" className="btn-ghost btn-sm inline-flex">
          ← Volver a Agenda
        </Link>
        <div className="flex items-center gap-3">
          {addedMsg && <span className="badge-green">{addedMsg}</span>}
          <button
            onClick={deleteCurrentCycle}
            className="btn-ghost btn-sm text-slate-500 hover:text-red-400 text-xs px-2.5 py-1"
            title="Eliminar este ciclo"
          >
            🗑 Eliminar Ciclo
          </button>
        </div>
      </div>

      {/* Cycle Header */}
      <div className="card-glow mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-white">{cycle.name}</h1>
              <span className={`badge ${isActive ? 'badge-green' : 'badge-yellow'}`}>
                {isActive ? '● Activo' : '✓ Cerrado'}
              </span>
              <span className="badge badge-purple">{weeksTotal} semanas</span>
            </div>
            <p className="text-sm text-slate-500">
              {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${executionPct >= 85 ? 'text-emerald-400' : executionPct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {executionPct}%
            </p>
            <p className="text-xs text-slate-500">ejecución global</p>
          </div>
        </div>

        {/* DUAL PROGRESS BARS FOR CYCLE */}
        <div className="mt-4 space-y-3 pt-3 border-t border-white/[0.06]">
          {/* BAR 1: Time Progress */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1">⏳ <strong>Progreso del Tiempo:</strong> Semana {currentWeek} de {weeksTotal}</span>
              <span>Día {elapsedDays} de {totalDays} ({timePct}% del tiempo transcurrido)</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill bg-blue-500/80"
                style={{ width: `${timePct}%` }}
              />
            </div>
          </div>

          {/* BAR 2: Tactics Execution Progress */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1">✅ <strong>Progreso de Tácticas (Ejecución Global):</strong></span>
              <span>{allTactics.filter(t => t.completed).length} de {allTactics.filter(t => t.description.trim() !== '').length} tácticas completadas ({executionPct}%)</span>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${executionPct >= 85 ? 'bg-emerald-400' : executionPct >= 60 ? 'bg-amber-400' : 'bg-violet-500'}`}
                style={{ width: `${executionPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-white/[0.03] rounded-xl w-fit flex-wrap">
        <button
          onClick={() => setActiveTab('objectives')}
          className={activeTab === 'objectives' ? 'tab-active' : 'tab-inactive'}
        >
          🎯 Objetivos ({cycle.objectives.length})
        </button>
        <button
          onClick={() => setActiveTab('weekly_plan')}
          className={activeTab === 'weekly_plan' ? 'tab-active' : 'tab-inactive'}
        >
          📋 Plan Semanal Acumulado
          {pendingPastTactics.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500/30 text-amber-300 text-[10px]">
              {pendingPastTactics.length} pendientes
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('scorecard')}
          className={activeTab === 'scorecard' ? 'tab-active' : 'tab-inactive'}
        >
          📊 Scorecard
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={activeTab === 'reviews' ? 'tab-active' : 'tab-inactive'}
        >
          📝 Revisiones
        </button>
      </div>

      {/* OBJECTIVES TAB */}
      {activeTab === 'objectives' && (
        <div className="space-y-4">
          {isActive && cycle.objectives.length < 4 && (
            <button
              onClick={() => setShowAddObj(true)}
              className="btn-secondary w-full border-dashed"
              id="add-objective-btn"
            >
              + Añadir Objetivo
            </button>
          )}

          {cycle.objectives.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-2xl mb-3">🎯</p>
              <p className="text-slate-400">No hay objetivos en este ciclo</p>
            </div>
          )}

          {cycle.objectives.map((obj) => {
            const isExpanded = expandedObj === obj.id
            const catMeta = LIFEBOOK_CATEGORIES.find((c) => c.slug === obj.lifebookCategory?.slug)
            
            // Objective Task Progress calculation (completed tactics vs total non-empty tactics)
            const activeTactics = obj.weeklyTactics.filter((t) => t.description.trim() !== '')
            const completedCount = activeTactics.filter((t) => t.completed).length
            const totalCount = activeTactics.length
            const taskPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

            return (
              <div key={obj.id} className="card">
                {/* Objective header */}
                <div
                  className="flex items-start gap-3 cursor-pointer"
                  onClick={() => setExpandedObj(isExpanded ? null : obj.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-slate-100">{obj.name}</h3>
                      {catMeta && (
                        <span className="badge badge-purple text-xs">{catMeta.icon} {catMeta.label}</span>
                      )}
                      {obj.linkedVision3 && <span className="badge badge-blue text-xs">3A</span>}
                      {obj.linkedVision5 && <span className="badge badge-blue text-xs">5A</span>}
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500 flex-wrap">
                      {obj.lagMeasure && <span>📏 {obj.lagMeasure}</span>}
                      {obj.leadMeasure && <span>🎯 {obj.leadMeasure}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold ${taskPct >= 85 ? 'text-emerald-400' : taskPct >= 60 ? 'text-amber-400' : 'text-slate-300'}`}>
                        {taskPct}%
                      </p>
                      <p className="text-xs text-slate-500">tácticas</p>
                    </div>
                    <span className="text-slate-500">{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* DUAL PROGRESS BARS FOR OBJECTIVE */}
                <div className="mt-4 space-y-2.5 pt-3 border-t border-white/[0.04]">
                  {/* BAR 1: Time Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span className="flex items-center gap-1">⏳ <strong>Progreso del Tiempo:</strong></span>
                      <span>Día {elapsedDays} de {totalDays} ({timePct}% del tiempo)</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill bg-blue-500/80"
                        style={{ width: `${timePct}%` }}
                      />
                    </div>
                  </div>

                  {/* BAR 2: Tactics Task Progress */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span className="flex items-center gap-1">✅ <strong>Progreso de Tácticas:</strong></span>
                      <span>{completedCount} de {totalCount} tácticas completadas ({taskPct}%)</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${taskPct >= 85 ? 'bg-emerald-400' : taskPct >= 60 ? 'bg-amber-400' : 'bg-violet-500'}`}
                        style={{ width: `${taskPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Tactics grouped by Week */}
                {isExpanded && (
                  <div className="mt-5 border-t border-white/[0.06] pt-5 space-y-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        Tácticas por Semana ({completedCount}/{totalCount} completadas)
                      </p>
                      {isActive && (
                        <button
                          onClick={() => deleteObjective(obj.id)}
                          className="btn-danger btn-sm"
                        >
                          Eliminar objetivo
                        </button>
                      )}
                    </div>

                    {/* Group tactics week by week (from 1 to weeksTotal) */}
                    <div className="space-y-4">
                      {Array.from({ length: weeksTotal }, (_, i) => i + 1).map((weekNum) => {
                        const weekTactics = obj.weeklyTactics.filter((t) => t.weekNumber === weekNum)
                        const key = `${obj.id}_${weekNum}`
                        const isCurrentWeek = weekNum === currentWeek
                        const isTargetingThisWeek = dragOverTarget === `${obj.id}_week_${weekNum}`

                        return (
                          <div
                            key={weekNum}
                            onDragOver={(e) => {
                              if (!isActive) return
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              setDragOverTarget(`${obj.id}_week_${weekNum}`)
                            }}
                            onDragLeave={() => {
                              setDragOverTarget(null)
                            }}
                            onDrop={(e) => {
                              if (!isActive) return
                              e.preventDefault()
                              setDragOverTarget(null)
                              const tacticId = e.dataTransfer.getData('text/plain') || draggedTacticId
                              if (tacticId) {
                                moveTacticToWeek(tacticId, weekNum)
                              }
                            }}
                            className={`p-3.5 rounded-xl border transition-all ${
                              isTargetingThisWeek
                                ? 'bg-violet-500/20 border-2 border-dashed border-violet-400 shadow-lg shadow-violet-500/20 scale-[1.01]'
                                : isCurrentWeek
                                ? 'bg-violet-500/[0.08] border-violet-500/30'
                                : 'bg-white/[0.02] border-white/[0.05]'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-xs font-bold flex items-center gap-1.5 flex-wrap ${isCurrentWeek ? 'text-violet-300' : 'text-slate-400'}`}>
                                <span>Semana {weekNum}</span>
                                {cycle && <span className="text-[11px] font-normal text-slate-400 font-mono">({getWeekDateRange(cycle.startDate, weekNum)})</span>}
                                {isCurrentWeek && <span className="badge-purple text-[10px]">Semana Actual</span>}
                                {isTargetingThisWeek && <span className="badge-green text-[10px]">↓ Soltar táctica aquí</span>}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {weekTactics.filter((t) => t.completed).length}/{weekTactics.length} tácticas
                              </span>
                            </div>

                            {/* Tactic items */}
                            <div className="space-y-2 mb-2">
                              {weekTactics.length === 0 ? (
                                <p className="text-xs text-slate-600 italic py-1">
                                  {isTargetingThisWeek ? '↓ Arrastra la táctica a esta área para asignarla' : 'Sin tácticas asignadas a esta semana'}
                                </p>
                              ) : (
                                weekTactics.map((tactic) => {
                                  const isBeingDragged = draggedTacticId === tactic.id
                                  return (
                                    <div
                                      key={tactic.id}
                                      draggable={isActive}
                                      onDragStart={(e) => {
                                        if (!isActive) return
                                        e.dataTransfer.setData('text/plain', tactic.id)
                                        e.dataTransfer.effectAllowed = 'move'
                                        setDraggedTacticId(tactic.id)
                                      }}
                                      onDragEnd={() => {
                                        setDraggedTacticId(null)
                                        setDragOverTarget(null)
                                      }}
                                      className={`flex items-center gap-2.5 p-2 rounded-lg transition-all ${
                                        isBeingDragged
                                          ? 'opacity-40 bg-violet-500/20 border border-violet-400 border-dashed scale-95'
                                          : 'bg-white/[0.03] hover:bg-white/[0.06]'
                                      }`}
                                    >
                                      {isActive && (
                                        <span
                                          className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 text-xs px-0.5 flex-shrink-0 select-none"
                                          title="Arrastrar táctica a otra semana"
                                        >
                                          ⋮⋮
                                        </span>
                                      )}
                                      <input
                                        type="text"
                                        value={tactic.description}
                                        onChange={(e) => updateTactic(tactic.id, 'description', e.target.value)}
                                        onBlur={(e) => updateTactic(tactic.id, 'description', e.target.value)}
                                        placeholder="Escribe la táctica de esta semana..."
                                        className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
                                        disabled={!isActive}
                                      />
                                      {tactic.description.trim() !== '' && (
                                        addedToDailyMap[tactic.id] ? (
                                          <span className="badge-green text-[10px] px-2 py-0.5 font-semibold flex items-center gap-1 select-none flex-shrink-0">
                                            ✓ Agregada a Hoy
                                          </span>
                                        ) : (
                                          <button
                                            onClick={() => sendToDailyAgenda(tactic.description, tactic.id)}
                                            disabled={addingToDay === tactic.id}
                                            className="btn-ghost btn-sm text-[11px] text-violet-300 px-2 py-1 flex-shrink-0"
                                            title="Añadir a la Agenda de Hoy"
                                          >
                                            {addingToDay === tactic.id ? '...' : '+ Hoy'}
                                          </button>
                                        )
                                      )}
                                      <button
                                        onClick={() => updateTactic(tactic.id, 'completed', !tactic.completed)}
                                        disabled={!isActive}
                                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                          tactic.completed
                                            ? 'bg-emerald-500 border-emerald-500'
                                            : 'border-white/20 hover:border-emerald-400/50'
                                        }`}
                                      >
                                        {tactic.completed && (
                                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </button>
                                      {isActive && (
                                        <button
                                          onClick={() => deleteTactic(tactic.id, obj.id)}
                                          className="text-slate-600 hover:text-red-400 text-xs px-1"
                                          title="Eliminar táctica"
                                        >
                                          🗑
                                        </button>
                                      )}
                                    </div>
                                  )
                                })
                              )}
                            </div>

                            {/* Add tactic to this week */}
                            {isActive && (
                              <div className="flex gap-2 mt-2">
                                <input
                                  type="text"
                                  value={newTacticInputs[key] || ''}
                                  onChange={(e) => setNewTacticInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                                  onKeyDown={(e) => e.key === 'Enter' && addTacticToWeek(obj.id, weekNum)}
                                  placeholder={`+ Nueva táctica para Semana ${weekNum}...`}
                                  className="input text-xs flex-1 py-1.5 px-3"
                                />
                                <button
                                  onClick={() => addTacticToWeek(obj.id, weekNum)}
                                  disabled={addingTacticKey === key || !(newTacticInputs[key] || '').trim()}
                                  className="btn-secondary btn-sm text-xs px-3"
                                >
                                  {addingTacticKey === key ? '...' : '+ Añadir'}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* WEEKLY ACCUMULATED PLAN TAB WITH ROLLOVER */}
      {activeTab === 'weekly_plan' && (
        <div className="space-y-6">
          {/* Week Selector */}
          <div className="flex items-center justify-between card">
            <span className="text-sm font-semibold text-slate-200">Ver tácticas de la semana:</span>
            <div className="flex gap-1 overflow-x-auto py-1 max-w-full">
              {Array.from({ length: weeksTotal }, (_, i) => i + 1).map((week) => (
                <button
                  key={week}
                  onClick={() => setSelectedWeekView(week)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all ${
                    selectedWeekView === week
                      ? 'bg-violet-600 text-white'
                      : week === currentWeek
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                      : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                  }`}
                >
                  Sem {week} {cycle && <span className="font-normal text-[11px] opacity-80 font-mono">({getWeekDateRange(cycle.startDate, week)})</span>} {week === currentWeek ? '★' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* ROLLOVER: Incomplete tasks carried over from past weeks */}
          {pendingPastTactics.length > 0 && (
            <div className="card border-amber-500/30 bg-amber-500/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-400 text-lg">⚠️</span>
                <div>
                  <h3 className="font-semibold text-amber-300 text-sm">
                    Tácticas Pendientes de Semanas Anteriores (Arrastre Automático)
                  </h3>
                  <p className="text-xs text-amber-200/80">
                    {pendingPastTactics.length} táctica{pendingPastTactics.length > 1 ? 's' : ''} no se completaron previamente y se han acumulado aquí.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {pendingPastTactics.map(({ objectiveName, tactic }) => (
                  <div key={tactic.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="badge-yellow text-[10px]">Semana {tactic.weekNumber}</span>
                        <span className="text-xs text-slate-400 truncate">{objectiveName}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-200">{tactic.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => sendToDailyAgenda(tactic.description, tactic.id)}
                        disabled={addingToDay === tactic.id}
                        className="btn-primary btn-sm text-xs"
                      >
                        + A mi Día
                      </button>
                      <button
                        onClick={() => updateTactic(tactic.id, 'completed', true)}
                        className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-bold text-xs"
                        title="Marcar como completada"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current selected week tasks across all objectives */}
          <div className="card">
            <h3 className="section-title mb-4">
              📋 Tácticas de la Semana {selectedWeekView} {cycle && <span className="text-slate-400 font-normal text-xs font-mono">({getWeekDateRange(cycle.startDate, selectedWeekView)})</span>} {selectedWeekView === currentWeek ? '— Semana Actual' : ''}
            </h3>

            {cycle.objectives.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No hay objetivos en este ciclo</p>
            ) : (
              <div className="space-y-4">
                {cycle.objectives.map((obj) => {
                  const weekTactics = obj.weeklyTactics.filter((t) => t.weekNumber === selectedWeekView)
                  return (
                    <div key={obj.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                      <h4 className="font-semibold text-slate-200 text-sm mb-3">🎯 {obj.name}</h4>
                      {weekTactics.length === 0 || weekTactics.every((t) => !t.description.trim()) ? (
                        <p className="text-xs text-slate-600 italic">Sin tácticas asignadas para la Semana {selectedWeekView}</p>
                      ) : (
                        <div className="space-y-2">
                          {weekTactics
                            .filter((t) => t.description.trim() !== '')
                            .map((tactic) => (
                              <div key={tactic.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.04]">
                                <span className={`text-sm ${tactic.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                  {tactic.description}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => sendToDailyAgenda(tactic.description, tactic.id)}
                                    disabled={addingToDay === tactic.id}
                                    className="btn-ghost btn-sm text-xs text-violet-300"
                                  >
                                    + Hoy
                                  </button>
                                  <button
                                    onClick={() => updateTactic(tactic.id, 'completed', !tactic.completed)}
                                    className={`w-6 h-6 rounded-lg border flex items-center justify-center ${tactic.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/20'}`}
                                  >
                                    {tactic.completed && '✓'}
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCORECARD TAB */}
      {activeTab === 'scorecard' && (
        <div className="card overflow-x-auto">
          <h2 className="section-title mb-4">📊 Scorecard Semanal ({weeksTotal} Semanas)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Semana</th>
                {cycle.objectives.map((o) => (
                  <th key={o.id} className="text-center py-2 px-3 text-slate-500 font-medium max-w-[120px]">
                    <span className="truncate block text-xs">{o.name.slice(0, 20)}...</span>
                  </th>
                ))}
                <th className="text-center py-2 px-3 text-slate-500 font-medium">Global</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: weeksTotal }, (_, i) => i + 1).map((week) => {
                const isCurrent = week === currentWeek
                const weekTactics = cycle.objectives.flatMap((o) =>
                  o.weeklyTactics.filter((t) => t.weekNumber === week)
                )
                const globalPct =
                  weekTactics.length > 0
                    ? Math.round((weekTactics.filter((t) => t.completed).length / weekTactics.length) * 100)
                    : 0

                return (
                  <tr key={week} className={`border-b border-white/[0.04] ${isCurrent ? 'bg-violet-500/10' : ''}`}>
                    <td className="py-2 px-3">
                      <span className={`text-xs font-mono ${isCurrent ? 'text-violet-300 font-bold' : 'text-slate-500'}`}>
                        Sem {week}{isCurrent ? ' ←' : ''}
                      </span>
                    </td>
                    {cycle.objectives.map((o) => {
                      const tactics = o.weeklyTactics.filter((t) => t.weekNumber === week)
                      const pct =
                        tactics.length > 0
                          ? Math.round((tactics.filter((t) => t.completed).length / tactics.length) * 100)
                          : null

                      return (
                        <td key={o.id} className="text-center py-2 px-3">
                          {pct !== null ? (
                            <span
                              className={`badge ${pct >= 85 ? 'badge-green' : pct >= 60 ? 'badge-yellow' : 'badge-red'}`}
                            >
                              {pct}%
                            </span>
                          ) : (
                            <span className="text-slate-700 text-xs">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="text-center py-2 px-3">
                      <span
                        className={`badge font-bold ${globalPct >= 85 ? 'badge-green' : globalPct >= 60 ? 'badge-yellow' : globalPct > 0 ? 'badge-red' : ''}`}
                        style={globalPct === 0 ? { color: '#475569' } : {}}
                      >
                        {globalPct > 0 ? `${globalPct}%` : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {isActive && (
            <button onClick={() => setShowReview(true)} className="btn-primary w-full" id="add-weekly-review">
              + Registrar Revisión Semana {currentWeek}
            </button>
          )}
          {cycle.weeklyReviews.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-2xl mb-2">📝</p>
              <p className="text-slate-400">No hay revisiones todavía</p>
            </div>
          ) : (
            cycle.weeklyReviews.map((review) => (
              <div key={review.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-200">Semana {review.weekNumber}</h3>
                  <span className={`badge ${review.executionScore >= 85 ? 'badge-green' : review.executionScore >= 60 ? 'badge-yellow' : 'badge-red'}`}>
                    {review.executionScore}%
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  {review.whatWorked && <p><span className="text-green-400">✓ Funcionó:</span> <span className="text-slate-400">{review.whatWorked}</span></p>}
                  {review.whatDidntWork && <p><span className="text-red-400">✗ No funcionó:</span> <span className="text-slate-400">{review.whatDidntWork}</span></p>}
                  {review.whatIAdjust && <p><span className="text-amber-400">↻ Ajuste:</span> <span className="text-slate-400">{review.whatIAdjust}</span></p>}
                  {review.whoIReport && <p><span className="text-blue-400">👤 Reporte a:</span> <span className="text-slate-400">{review.whoIReport}</span></p>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Objective Modal */}
      {showAddObj && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddObj(false)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/[0.06]">
              <h2 className="text-lg font-bold text-white">Nuevo Objetivo</h2>
              <p className="text-xs text-slate-400 mt-1">Crea un objetivo y asigna tácticas por semana</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Nombre del objetivo (medible) *</label>
                <input
                  type="text"
                  value={objForm.name}
                  onChange={(e) => setObjForm((f) => ({ ...f, name: e.target.value }))}
                  className="input"
                  placeholder="ej. Publicar 3 artículos semanales en el blog"
                  id="objective-name"
                />
              </div>
              <div>
                <label className="label">Indicador de resultado (Lag Measure)</label>
                <input
                  type="text"
                  value={objForm.lagMeasure}
                  onChange={(e) => setObjForm((f) => ({ ...f, lagMeasure: e.target.value }))}
                  className="input"
                  placeholder="ej. 36 artículos publicados al final del ciclo"
                />
              </div>
              <div>
                <label className="label">Indicador líder semanal (Lead Measure)</label>
                <input
                  type="text"
                  value={objForm.leadMeasure}
                  onChange={(e) => setObjForm((f) => ({ ...f, leadMeasure: e.target.value }))}
                  className="input"
                  placeholder="ej. 3 artículos redactados y publicados por semana"
                />
              </div>
              <div>
                <label className="label">Categoría Lifebook</label>
                <select
                  value={objForm.lifebookCategoryId}
                  onChange={(e) => setObjForm((f) => ({ ...f, lifebookCategoryId: e.target.value }))}
                  className="input"
                >
                  <option value="">Sin categoría</option>
                  {LIFEBOOK_CATEGORIES.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Vinculado a visión</label>
                <div className="flex gap-4">
                  {[['linkedVision3', 'Visión 3 años'], ['linkedVision5', 'Visión 5 años']].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={objForm[key as 'linkedVision3' | 'linkedVision5']}
                        onChange={(e) => setObjForm((f) => ({ ...f, [key]: e.target.checked }))}
                        className="w-4 h-4 accent-violet-500"
                      />
                      <span className="text-sm text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {objError && <div className="alert-danger"><span>⚠️</span><span>{objError}</span></div>}
              <div className="flex gap-3">
                <button onClick={() => setShowAddObj(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={addObjective} disabled={creating} className="btn-primary flex-1" id="create-objective-submit">
                  {creating ? 'Creando...' : 'Crear Objetivo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Review Modal */}
      {showReview && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowReview(false)}>
          <div className="modal-content max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/[0.06]">
              <h2 className="text-lg font-bold text-white">Revisión Semanal — Semana {currentWeek}</h2>
            </div>
            <div className="p-6 space-y-4">
              {[
                ['whatWorked', '¿Qué funcionó esta semana?', '🟢'],
                ['whatDidntWork', '¿Qué no funcionó?', '🔴'],
                ['whatIAdjust', '¿Qué ajusto la próxima semana?', '🟡'],
                ['whoIReport', '¿A quién le reporto este avance?', '👤'],
              ].map(([key, label, icon]) => (
                <div key={key}>
                  <label className="label">{icon} {label}</label>
                  <textarea
                    className="textarea w-full"
                    rows={3}
                    value={reviewForm[key as keyof typeof reviewForm]}
                    onChange={(e) => setReviewForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <button onClick={() => setShowReview(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={saveWeeklyReview} className="btn-primary flex-1">Guardar Revisión</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
