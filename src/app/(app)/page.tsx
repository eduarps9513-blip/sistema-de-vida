'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getTodayString, getWeekDateRange } from '@/lib/utils'
import PerformanceChart from '@/components/PerformanceChart'

type HabitLog = {
  id: string
  date: string
  completed: boolean
}

type Habit = {
  id: string
  name: string
  scheduledTime: string
  status: string
  logs: HabitLog[]
}

type WeeklyTactic = {
  id: string
  weekNumber: number
  description: string
  completed: boolean
}

type Objective = {
  id: string
  name: string
  lagMeasure: string
  weeklyTactics: WeeklyTactic[]
}

type ActiveCycle = {
  id: string
  name: string
  startDate: string
  endDate: string
  totalWeeks?: number
  objectives: Objective[]
}

type DashboardData = {
  habits: Habit[]
  habitsAlert: string[]
  activeCycle: ActiveCycle | null
  currentWeek: number
  weeklyScore: number
  reviewsCount: number
  staleCategories: number
  today: string
}

type DailyTask = {
  id: string
  title: string
  date: string
  completed: boolean
  sourceType: string | null
  sourceId: string | null
}

function CircularProgress({ value, size = 80 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = value >= 85 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth="8" fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
      />
    </svg>
  )
}

function getTomorrowString(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

  // Live Performance Chart Refresh Key
  const [chartRefreshKey, setChartRefreshKey] = useState(0)
  const triggerChartRefresh = useCallback(() => {
    setChartRefreshKey((k) => k + 1)
  }, [])

  // Daily Agenda state
  const [dailyAgendaTab, setDailyAgendaTab] = useState<'today' | 'tomorrow' | 'week_all'>('today')
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedObjForTask, setSelectedObjForTask] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [tacticAddingMsg, setTacticAddingMsg] = useState('')

  // Week tab inline tactic inputs: { [objectiveId]: string }
  const [weekTacticInputs, setWeekTacticInputs] = useState<Record<string, string>>({})
  const [addingTacticObjId, setAddingTacticObjId] = useState<string | null>(null)

  const todayStr = getTodayString()
  const tomorrowStr = getTomorrowString()
  const activeDate = dailyAgendaTab === 'today' ? todayStr : tomorrowStr

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDailyTasks = useCallback(async (date: string) => {
    const res = await fetch(`/api/daily-tasks?date=${date}`)
    if (res.ok) {
      const json = await res.json()
      setDailyTasks(json)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (dailyAgendaTab !== 'week_all') {
      loadDailyTasks(activeDate)
    }
  }, [activeDate, dailyAgendaTab, loadDailyTasks])

  const toggleHabit = async (habitId: string, currentCompleted: boolean) => {
    if (!data) return
    setToggling(habitId)

    setData(prev => {
      if (!prev) return prev
      return {
        ...prev,
        habits: prev.habits.map(h => {
          if (h.id !== habitId) return h
          const existingLog = h.logs.find(l => l.date === prev.today)
          if (existingLog) {
            return { ...h, logs: h.logs.map(l => l.date === prev.today ? { ...l, completed: !currentCompleted } : l) }
          } else {
            return { ...h, logs: [...h.logs, { id: 'temp', date: prev.today, completed: true }] }
          }
        }),
      }
    })

    await fetch('/api/habit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId, date: data.today, completed: !currentCompleted }),
    })

    setToggling(null)
    setTimeout(() => {
      loadDashboard()
      triggerChartRefresh()
    }, 300)
  }

  const addDailyTask = async () => {
    if (!newTaskTitle.trim()) return
    setAddingTask(true)
    const res = await fetch('/api/daily-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTaskTitle.trim(),
        date: activeDate,
        objectiveId: selectedObjForTask || undefined,
        weekNumber: data?.currentWeek || 1,
      }),
    })
    const created = await res.json()
    setAddingTask(false)
    if (res.ok) {
      setDailyTasks(prev => [...prev, created])
      setNewTaskTitle('')
      setSelectedObjForTask('')
      setTimeout(() => {
        loadDashboard()
        triggerChartRefresh()
      }, 300)
    }
  }

  const toggleDailyTask = async (taskId: string, currentCompleted: boolean) => {
    setDailyTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !currentCompleted } : t))
    await fetch('/api/daily-tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, completed: !currentCompleted }),
    })
    setTimeout(() => {
      loadDashboard()
      triggerChartRefresh()
    }, 300)
  }

  const moveDailyTaskDate = async (taskId: string, targetDate: string) => {
    setDailyTasks(prev => prev.filter(t => t.id !== taskId))
    await fetch('/api/daily-tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, date: targetDate }),
    })
    setTimeout(() => {
      loadDashboard()
      triggerChartRefresh()
    }, 300)
  }

  const deleteDailyTask = async (taskId: string) => {
    setDailyTasks(prev => prev.filter(t => t.id !== taskId))
    await fetch('/api/daily-tasks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId }),
    })
    setTimeout(() => {
      loadDashboard()
      triggerChartRefresh()
    }, 300)
  }

  const toggleWeeklyTactic = async (tacticId: string, currentCompleted: boolean) => {
    await fetch('/api/tactics', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tacticId, completed: !currentCompleted }),
    })
    loadDashboard()
    triggerChartRefresh()
  }

  const changeTacticWeek = async (tacticId: string, newWeek: number) => {
    await fetch('/api/tactics', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tacticId, weekNumber: newWeek }),
    })
    loadDashboard()
    triggerChartRefresh()
  }

  const sendTacticToDailyAgenda = async (tacticDescription: string, tacticId: string, targetDate: string) => {
    const res = await fetch('/api/daily-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: tacticDescription,
        date: targetDate,
        sourceType: 'TACTIC',
        sourceId: tacticId,
      }),
    })
    if (res.ok) {
      setTacticAddingMsg(`✓ Tarea añadida a ${targetDate === todayStr ? 'Hoy' : 'Mañana'}`)
      setTimeout(() => setTacticAddingMsg(''), 3000)
    }
  }

  const addTacticInWeekTab = async (objectiveId: string) => {
    const text = (weekTacticInputs[objectiveId] || '').trim()
    if (!text) return
    setAddingTacticObjId(objectiveId)

    const res = await fetch('/api/tactics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectiveId,
        weekNumber: data?.currentWeek || 1,
        description: text,
      }),
    })

    setAddingTacticObjId(null)
    if (res.ok) {
      setWeekTacticInputs(prev => ({ ...prev, [objectiveId]: '' }))
      loadDashboard()
      triggerChartRefresh()
    }
  }

  const now = new Date()
  const greeting = now.getHours() < 12 ? '☀️ Buenos días' : now.getHours() < 19 ? '🌤 Buenas tardes' : '🌙 Buenas noches'
  const dateStr = now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="shimmer h-28 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="shimmer h-24 rounded-2xl" />)}
        </div>
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    )
  }

  const activeHabits = data?.habits.filter(h => h.status === 'ACTIVE') ?? []
  const activeCycle = data?.activeCycle
  const currentWeek = data?.currentWeek ?? 1
  const weeksTotal = activeCycle?.totalWeeks ?? 12

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Greeting Header */}
      <div className="card-glow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-slate-400 text-sm capitalize">{dateStr}</p>
            <h1 className="text-2xl font-bold text-white mt-1">{greeting}</h1>
            {activeCycle && (
              <p className="text-slate-400 text-sm mt-1">
                Semana <span className="text-violet-300 font-semibold">{currentWeek}</span> de {weeksTotal}
                {' '}· Ciclo: <span className="text-slate-300">{activeCycle.name}</span>
              </p>
            )}
          </div>
          <div className="relative">
            <CircularProgress value={data?.weeklyScore ?? 0} size={72} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-base font-bold text-white">{data?.weeklyScore ?? 0}%</span>
              <span className="text-[9px] text-slate-500 leading-none">semana</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Row */}
      {(data?.habitsAlert?.length ?? 0) > 0 && (
        <div className="alert-danger">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-semibold">¡No falles dos veces seguidas!</p>
            <p className="text-sm text-red-300/80 mt-0.5">
              {data!.habitsAlert.length} hábito{data!.habitsAlert.length > 1 ? 's' : ''} sin marcar 2 días consecutivos.
              Vuelve a la racha hoy.
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon="⚡" label="Hábitos hoy"
          value={`${activeHabits.filter(h => h.logs.some(l => l.date === data?.today && l.completed)).length}/${activeHabits.length}`}
          color="violet"
        />
        <StatCard
          icon="🧠" label="Repasos hoy"
          value={String(data?.reviewsCount ?? 0)}
          color={data?.reviewsCount ? 'amber' : 'slate'}
          href="/study/review"
          clickable={!!data?.reviewsCount}
        />
        <StatCard
          icon="📊" label="Meta semanal"
          value={`${data?.weeklyScore ?? 0}%`}
          color={(data?.weeklyScore ?? 0) >= 85 ? 'green' : 'amber'}
          subtitle="Meta: 85%"
        />
        <StatCard
          icon="📖" label="Lifebook"
          value={data?.staleCategories ? `${data.staleCategories} cat.` : 'Al día ✓'}
          color={data?.staleCategories ? 'red' : 'green'}
          href="/lifebook"
          subtitle={data?.staleCategories ? '+90 días sin actualizar' : undefined}
        />
      </div>

      {/* WALL STREET PERFORMANCE CHART WITH LIVE REFRESH TRIGGER */}
      <PerformanceChart refreshTrigger={chartRefreshKey} />

      {/* AGENDA DEL DÍA (Hoy, Mañana y Toda la Semana) */}
      <section className="card border-violet-500/20 bg-violet-500/[0.03]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <div>
              <h2 className="section-title">Agenda & Planificación</h2>
              <p className="text-xs text-slate-400">Tus tareas de hoy, tu día siguiente y el panorama de la semana</p>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl flex-wrap">
            <button
              onClick={() => setDailyAgendaTab('today')}
              className={dailyAgendaTab === 'today' ? 'tab-active text-xs' : 'tab-inactive text-xs'}
            >
              ☀️ Hoy ({dailyTasks.filter(t => t.date === todayStr).length})
            </button>
            <button
              onClick={() => setDailyAgendaTab('tomorrow')}
              className={dailyAgendaTab === 'tomorrow' ? 'tab-active text-xs' : 'tab-inactive text-xs'}
            >
              🌙 Mañana ({dailyTasks.filter(t => t.date === tomorrowStr).length})
            </button>
            <button
              onClick={() => setDailyAgendaTab('week_all')}
              className={dailyAgendaTab === 'week_all' ? 'tab-active text-xs' : 'tab-inactive text-xs'}
            >
              🗓️ Toda la Semana (S{currentWeek})
            </button>
          </div>
        </div>

        {tacticAddingMsg && <div className="mb-3"><span className="badge-green text-xs">{tacticAddingMsg}</span></div>}

        {/* Form to add task/tactic (For Today or Tomorrow tabs) */}
        {dailyAgendaTab !== 'week_all' && (
          <div className="space-y-2 mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDailyTask()}
                className="input flex-1 text-sm"
                placeholder={dailyAgendaTab === 'today' ? 'Añadir tarea a mi día...' : 'Planificar tarea para mañana...'}
              />
              <button
                onClick={addDailyTask}
                disabled={addingTask || !newTaskTitle.trim()}
                className="btn-primary flex-shrink-0"
              >
                {addingTask ? '...' : '+ Añadir'}
              </button>
            </div>

            {/* Optional objective linking dropdown */}
            {activeCycle && activeCycle.objectives.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">🎯 Vincular a objetivo (opcional):</span>
                <select
                  value={selectedObjForTask}
                  onChange={e => setSelectedObjForTask(e.target.value)}
                  className="input text-xs py-1 px-2.5 max-w-xs"
                >
                  <option value="">Sin objetivo (Tarea personal)</option>
                  {activeCycle.objectives.map(obj => (
                    <option key={obj.id} value={obj.id}>
                      🎯 {obj.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* TAB 1 & 2: TODAY & TOMORROW LIST */}
        {dailyAgendaTab !== 'week_all' && (
          <div>
            {dailyTasks.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
                <p className="text-xs text-slate-500">
                  No tienes tareas específicas programadas para {dailyAgendaTab === 'today' ? 'hoy' : 'mañana'}.
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Escribe una nueva tarea arriba o revisa la pestaña &quot;Toda la Semana&quot;.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {dailyTasks.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-emerald-500/[0.08] border-emerald-500/20'
                        : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
                    }`}
                  >
                    <button
                      onClick={() => toggleDailyTask(task.id, task.completed)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-white/20 hover:border-emerald-400/50'
                      }`}
                    >
                      {task.completed && '✓'}
                    </button>

                    <span className={`flex-1 text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {task.title}
                    </span>

                    {task.sourceType === 'TACTIC' && (
                      <span className="badge-purple text-[10px] flex-shrink-0">Objetivo</span>
                    )}

                    {/* Quick Move Button: Hoy -> Mañana or Mañana -> Hoy */}
                    {dailyAgendaTab === 'today' ? (
                      <button
                        onClick={() => moveDailyTaskDate(task.id, tomorrowStr)}
                        className="btn-ghost btn-sm text-[11px] text-blue-300 px-2 py-0.5"
                        title="Mover tarea al día siguiente"
                      >
                        ➡️ Mañana
                      </button>
                    ) : (
                      <button
                        onClick={() => moveDailyTaskDate(task.id, todayStr)}
                        className="btn-ghost btn-sm text-[11px] text-amber-300 px-2 py-0.5"
                        title="Mover tarea a Hoy"
                      >
                        ⬅️ Hoy
                      </button>
                    )}

                    <button
                      onClick={() => deleteDailyTask(task.id)}
                      className="btn-ghost btn-sm text-slate-500 hover:text-red-400 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FULL WEEK TACTICS LIST */}
        {dailyAgendaTab === 'week_all' && (
          <div className="space-y-4">
            {!activeCycle ? (
              <p className="text-xs text-slate-500 text-center py-6">No tienes un ciclo activo en tu Agenda.</p>
            ) : activeCycle.objectives.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No hay objetivos definidos en el ciclo actual.</p>
            ) : (
              activeCycle.objectives.map(obj => {
                const weekTactics = obj.weeklyTactics.filter(t => t.weekNumber === currentWeek && t.description.trim() !== '')

                return (
                  <div key={obj.id} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="font-semibold text-slate-200 text-xs">🎯 {obj.name}</h4>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Semana {currentWeek} {activeCycle && `(${getWeekDateRange(activeCycle.startDate, currentWeek)})`}
                      </span>
                    </div>

                    {weekTactics.length === 0 ? (
                      <p className="text-[11px] text-slate-600 italic mb-2">Sin tácticas registradas para la Semana {currentWeek}</p>
                    ) : (
                      <div className="space-y-2 mb-3">
                        {weekTactics.map(tactic => (
                          <div key={tactic.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.04]">
                            <button
                              onClick={() => toggleWeeklyTactic(tactic.id, tactic.completed)}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                                tactic.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-white/20 hover:border-emerald-400/50'
                              }`}
                            >
                              {tactic.completed && '✓'}
                            </button>

                            <span className={`flex-1 text-sm ${tactic.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {tactic.description}
                            </span>

                            <button
                              onClick={() => sendTacticToDailyAgenda(tactic.description, tactic.id, todayStr)}
                              className="btn-ghost btn-sm text-[11px] text-violet-300 px-2 py-0.5"
                            >
                              + Hoy
                            </button>
                            <button
                              onClick={() => sendTacticToDailyAgenda(tactic.description, tactic.id, tomorrowStr)}
                              className="btn-ghost btn-sm text-[11px] text-blue-300 px-2 py-0.5"
                            >
                              + Mañana
                            </button>

                            {/* Re-assign to another week */}
                            <select
                              value={tactic.weekNumber}
                              onChange={e => changeTacticWeek(tactic.id, Number(e.target.value))}
                              className="bg-slate-800 border border-white/10 text-[11px] text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
                              title="Cambiar de semana esta táctica"
                            >
                              {Array.from({ length: weeksTotal }, (_, i) => i + 1).map(w => (
                                <option key={w} value={w}>Sem {w}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline form to add tactic directly to this objective in week_all tab */}
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={weekTacticInputs[obj.id] || ''}
                        onChange={e => setWeekTacticInputs(prev => ({ ...prev, [obj.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addTacticInWeekTab(obj.id)}
                        placeholder={`+ Añadir táctica a "${obj.name.slice(0, 25)}..." (Semana ${currentWeek})`}
                        className="input text-xs flex-1 py-1.5 px-3"
                      />
                      <button
                        onClick={() => addTacticInWeekTab(obj.id)}
                        disabled={addingTacticObjId === obj.id || !(weekTacticInputs[obj.id] || '').trim()}
                        className="btn-primary btn-sm text-xs px-3 flex-shrink-0"
                      >
                        {addingTacticObjId === obj.id ? '...' : '+ Añadir'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </section>

      {/* Habits Checklist */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">⚡ Hábitos de Hoy</h2>
          <Link href="/habits" className="btn-ghost btn-sm">Ver todos →</Link>
        </div>

        {activeHabits.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-3xl mb-3">⚡</p>
            <p className="text-slate-300 font-medium">No tienes hábitos activos</p>
            <p className="text-slate-500 text-sm mt-1">Crea tu primer hábito para empezar</p>
            <Link href="/habits" className="btn-primary mt-4 inline-flex">+ Crear Hábito</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {activeHabits.map(habit => {
              const todayLog = habit.logs.find(l => l.date === data?.today)
              const isCompleted = todayLog?.completed ?? false
              const isAlert = data?.habitsAlert?.includes(habit.id) ?? false

              return (
                <div
                  key={habit.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-500/[0.08] border-emerald-500/20'
                      : isAlert
                      ? 'bg-red-500/[0.06] border-red-500/20'
                      : 'bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.06]'
                  }`}
                  onClick={() => toggleHabit(habit.id, isCompleted)}
                >
                  <div className={`habit-checkbox ${isCompleted ? 'checked' : ''} ${toggling === habit.id ? 'opacity-50' : ''}`}>
                    {isCompleted && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isAlert && !isCompleted && <span className="text-xs text-red-400">!</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {habit.name}
                    </p>
                    {habit.scheduledTime && (
                      <p className="text-xs text-slate-500 mt-0.5">🕐 {habit.scheduledTime}</p>
                    )}
                  </div>

                  <div className={`text-sm font-semibold transition-colors ${isCompleted ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {isCompleted ? '✓' : '○'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Active Objectives */}
      {activeCycle && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">🎯 Objetivos Activos</h2>
            <Link href={`/cycles/${activeCycle.id}`} className="btn-ghost btn-sm">Ir a Agenda →</Link>
          </div>

          <div className="space-y-3">
            {activeCycle.objectives.map(obj => {
              const weekTactics = obj.weeklyTactics.filter(t => t.weekNumber === currentWeek)
              const completedCount = weekTactics.filter(t => t.completed).length
              const totalCount = weekTactics.length
              const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

              return (
                <div key={obj.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-slate-200 leading-tight">{obj.name}</p>
                    <span className={`badge flex-shrink-0 ${pct >= 85 ? 'badge-green' : pct >= 60 ? 'badge-yellow' : 'badge-red'}`}>
                      {pct}%
                    </span>
                  </div>
                  {obj.lagMeasure && (
                    <p className="text-xs text-slate-500 mb-3">📏 {obj.lagMeasure}</p>
                  )}
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${pct >= 85 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5">Semana {currentWeek}: {completedCount}/{totalCount} tácticas</p>
                </div>
              )
            })}

            {activeCycle.objectives.length === 0 && (
              <div className="card text-center py-8">
                <p className="text-slate-400 text-sm">No hay objetivos en este ciclo</p>
                <Link href={`/cycles/${activeCycle.id}`} className="btn-primary mt-3 inline-flex">+ Añadir Objetivo</Link>
              </div>
            )}
          </div>
        </section>
      )}

      {!activeCycle && (
        <div className="card text-center py-10">
          <p className="text-3xl mb-3">📅</p>
          <p className="text-slate-300 font-medium">No tienes un ciclo activo en tu Agenda</p>
          <p className="text-slate-500 text-sm mt-1">Crea tu primer ciclo para empezar a planificar</p>
          <Link href="/cycles" className="btn-primary mt-4 inline-flex">+ Crear Ciclo</Link>
        </div>
      )}

      {/* Spaced Repetition Banner */}
      {(data?.reviewsCount ?? 0) > 0 && (
        <Link href="/study/review">
          <div className="card border-violet-500/30 bg-violet-500/[0.08] hover:bg-violet-500/[0.12] cursor-pointer transition-all">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🧠</div>
              <div className="flex-1">
                <p className="font-semibold text-violet-200">
                  {data!.reviewsCount} nota{data!.reviewsCount > 1 ? 's' : ''} para repasar hoy
                </p>
                <p className="text-violet-400/70 text-sm">Repetición espaciada · Toca para repasar →</p>
              </div>
              <div className="text-violet-400 text-xl">→</div>
            </div>
          </div>
        </Link>
      )}
    </div>
  )
}

function StatCard({
  icon, label, value, color, subtitle, href, clickable = false,
}: {
  icon: string
  label: string
  value: string
  color: 'violet' | 'green' | 'amber' | 'red' | 'slate'
  subtitle?: string
  href?: string
  clickable?: boolean
}) {
  const colorMap = {
    violet: 'text-violet-300 bg-violet-500/10 border-violet-500/20',
    green: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    red: 'text-red-300 bg-red-500/10 border-red-500/20',
    slate: 'text-slate-400 bg-white/[0.04] border-white/[0.08]',
  }

  const content = (
    <div className={`p-4 rounded-xl border transition-all duration-200 ${colorMap[color]} ${clickable ? 'cursor-pointer hover:opacity-80' : ''}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-70 font-medium">{label}</p>
      {subtitle && <p className="text-xs opacity-50 mt-0.5">{subtitle}</p>}
    </div>
  )

  if (href && clickable) {
    return <Link href={href}>{content}</Link>
  }
  return content
}
