import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getUser() {
  const session = await getServerSession(authOptions)
  const email = (session?.user as { email?: string })?.email
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

function formatDateToIso(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatYearMonth(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export async function GET(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || 'week' // 'week' | 'month' | 'quarter' | 'year'

  // Fetch all user daily tasks (tasks and tactics)
  const dailyTasks = await prisma.dailyTask.findMany({
    where: { userId: user.id },
  })

  // Fetch all user habits with all logs
  const habits = await prisma.habit.findMany({
    where: { userId: user.id },
    include: { logs: true },
  })

  // Fetch active cycle and objectives for fallback active tactics count
  const activeCycle = await prisma.twelveWeekCycle.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
    include: {
      objectives: {
        include: { weeklyTactics: true },
      },
    },
  })

  const activeHabitsCount = habits.filter((h) => h.status === 'ACTIVE').length || 1
  const today = new Date()
  const todayIso = formatDateToIso(today)

  const points: { label: string; objectivesPct: number; habitsPct: number; dateIso: string }[] = []

  if (range === 'week') {
    // ----------------------------------------------------
    // SEMANA: Últimos 7 días (Día por día Aislado)
    // ----------------------------------------------------
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateIso = formatDateToIso(d)
      const dayName = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })

      // 1. Real Habits % for SPECIFIC dateIso
      let completedHabits = 0
      habits.forEach((h) => {
        const log = h.logs.find((l) => l.date === dateIso)
        if (log?.completed) completedHabits++
      })
      const habitsPct = Math.round((completedHabits / activeHabitsCount) * 100)

      // 2. Real Objectives % for SPECIFIC dateIso
      const tasksForDay = dailyTasks.filter((t) => t.date === dateIso)
      let objectivesPct = 0

      if (tasksForDay.length > 0) {
        const completedTasks = tasksForDay.filter((t) => t.completed).length
        objectivesPct = Math.round((completedTasks / tasksForDay.length) * 100)
      } else if (dateIso === todayIso && activeCycle) {
        // Fallback for today if tasks haven't been added to daily agenda yet
        const activeTactics = activeCycle.objectives.flatMap((o) =>
          o.weeklyTactics.filter((t) => t.description.trim() !== '')
        )
        if (activeTactics.length > 0) {
          const completedTactics = activeTactics.filter((t) => t.completed).length
          objectivesPct = Math.round((completedTactics / activeTactics.length) * 100)
        }
      }

      points.push({
        label: dayName,
        objectivesPct: Math.min(100, objectivesPct),
        habitsPct: Math.min(100, habitsPct),
        dateIso,
      })
    }
  } else if (range === 'month') {
    // ----------------------------------------------------
    // MES: Últimos 30 días (Muestreo cada 3 días Aislado)
    // ----------------------------------------------------
    for (let i = 9; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i * 3)
      const dateIso = formatDateToIso(d)
      const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

      // Habits % for dateIso
      let completedHabits = 0
      habits.forEach((h) => {
        const log = h.logs.find((l) => l.date === dateIso)
        if (log?.completed) completedHabits++
      })
      const habitsPct = Math.round((completedHabits / activeHabitsCount) * 100)

      // Objectives % for dateIso
      const tasksForDay = dailyTasks.filter((t) => t.date === dateIso)
      let objectivesPct = 0

      if (tasksForDay.length > 0) {
        const completedTasks = tasksForDay.filter((t) => t.completed).length
        objectivesPct = Math.round((completedTasks / tasksForDay.length) * 100)
      } else if (dateIso === todayIso && activeCycle) {
        const activeTactics = activeCycle.objectives.flatMap((o) =>
          o.weeklyTactics.filter((t) => t.description.trim() !== '')
        )
        if (activeTactics.length > 0) {
          const completedTactics = activeTactics.filter((t) => t.completed).length
          objectivesPct = Math.round((completedTactics / activeTactics.length) * 100)
        }
      }

      points.push({
        label,
        objectivesPct: Math.min(100, objectivesPct),
        habitsPct: Math.min(100, habitsPct),
        dateIso,
      })
    }
  } else if (range === 'quarter') {
    // ----------------------------------------------------
    // 3 MESES: Últimas 12 Semanas (Dividido en ventanas de 7 días estrictas)
    // ----------------------------------------------------
    for (let w = 11; w >= 0; w--) {
      const weekEnd = new Date(today)
      weekEnd.setDate(weekEnd.getDate() - w * 7)
      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekStart.getDate() - 6)

      const startIso = formatDateToIso(weekStart)
      const endIso = formatDateToIso(weekEnd)
      const label = `Sem ${12 - w}`

      // Real Habit logs recorded inside [startIso, endIso]
      let logsInWeek: { completed: boolean }[] = []
      habits.forEach((h) => {
        h.logs.forEach((l) => {
          if (l.date >= startIso && l.date <= endIso) {
            logsInWeek.push(l)
          }
        })
      })
      const habitsPct =
        logsInWeek.length > 0
          ? Math.round((logsInWeek.filter((l) => l.completed).length / logsInWeek.length) * 100)
          : 0

      // Real Objectives tasks recorded inside [startIso, endIso]
      const tasksInWeek = dailyTasks.filter((t) => t.date >= startIso && t.date <= endIso)
      let objectivesPct = 0

      if (tasksInWeek.length > 0) {
        const done = tasksInWeek.filter((t) => t.completed).length
        objectivesPct = Math.round((done / tasksInWeek.length) * 100)
      } else if (w === 0 && activeCycle) {
        // If current week has no daily tasks recorded yet, check active cycle tactics
        const activeTactics = activeCycle.objectives.flatMap((o) =>
          o.weeklyTactics.filter((t) => t.description.trim() !== '')
        )
        if (activeTactics.length > 0) {
          const completedTactics = activeTactics.filter((t) => t.completed).length
          objectivesPct = Math.round((completedTactics / activeTactics.length) * 100)
        }
      }

      points.push({
        label,
        objectivesPct: Math.min(100, objectivesPct),
        habitsPct: Math.min(100, habitsPct),
        dateIso: `${startIso} al ${endIso}`,
      })
    }
  } else {
    // ----------------------------------------------------
    // AÑO: Últimos 12 Meses (Dividido por meses estricto YYYY-MM)
    // ----------------------------------------------------
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const ym = formatYearMonth(d)
      const monthName = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`

      // Real Habit logs for month YYYY-MM
      let logsInMonth: { completed: boolean }[] = []
      habits.forEach((h) => {
        h.logs.forEach((l) => {
          if (l.date.startsWith(ym)) {
            logsInMonth.push(l)
          }
        })
      })
      const habitsPct =
        logsInMonth.length > 0
          ? Math.round((logsInMonth.filter((l) => l.completed).length / logsInMonth.length) * 100)
          : 0

      // Real Objectives tasks for month YYYY-MM
      const tasksInMonth = dailyTasks.filter((t) => t.date.startsWith(ym))
      let objectivesPct = 0

      if (tasksInMonth.length > 0) {
        const done = tasksInMonth.filter((t) => t.completed).length
        objectivesPct = Math.round((done / tasksInMonth.length) * 100)
      } else if (i === 0 && activeCycle) {
        // Current month fallback if no historical daily tasks
        const activeTactics = activeCycle.objectives.flatMap((o) =>
          o.weeklyTactics.filter((t) => t.description.trim() !== '')
        )
        if (activeTactics.length > 0) {
          const completedTactics = activeTactics.filter((t) => t.completed).length
          objectivesPct = Math.round((completedTactics / activeTactics.length) * 100)
        }
      }

      points.push({
        label: monthName,
        objectivesPct: Math.min(100, objectivesPct),
        habitsPct: Math.min(100, habitsPct),
        dateIso: ym,
      })
    }
  }

  // Calculate overall averages across real data points
  const objectivesAvg = points.length > 0
    ? Math.round(points.reduce((acc, p) => acc + p.objectivesPct, 0) / points.length)
    : 0
  const habitsAvg = points.length > 0
    ? Math.round(points.reduce((acc, p) => acc + p.habitsPct, 0) / points.length)
    : 0

  return NextResponse.json({
    range,
    points,
    objectivesAvg,
    habitsAvg,
  })
}
