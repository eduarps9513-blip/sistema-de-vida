import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayString, getCurrentWeekOfCycle } from '@/lib/utils'

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = (session?.user as { email?: string })?.email
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const today = getTodayString()

  // Get dates for 2-day alert
  const getDateStr = (daysAgo: number) => {
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  const yesterdayStr = getDateStr(1)
  const dayBeforeStr = getDateStr(2)

  // Active habits with recent logs
  const habits = await prisma.habit.findMany({
    where: { userId: user.id, status: 'ACTIVE' },
    include: {
      logs: {
        where: { date: { in: [today, yesterdayStr, dayBeforeStr] } },
        orderBy: { date: 'desc' },
      },
    },
  })

  // Alert: 2 consecutive days missed
  const habitsAlert = habits
    .filter((h) => {
      const yesterdayLog = h.logs.find((l) => l.date === yesterdayStr)
      const dayBeforeLog = h.logs.find((l) => l.date === dayBeforeStr)
      const missedYesterday = yesterdayLog ? !yesterdayLog.completed : false
      const missedDayBefore = dayBeforeLog ? !dayBeforeLog.completed : false
      return missedYesterday && missedDayBefore
    })
    .map((h) => h.id)

  // Active cycle
  const activeCycle = await prisma.twelveWeekCycle.findFirst({
    where: { userId: user.id, status: 'ACTIVE' },
    include: {
      objectives: {
        include: { weeklyTactics: true },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { startDate: 'desc' },
  })

  // Weekly execution score
  let weeklyScore = 0
  let currentWeek = 1
  if (activeCycle) {
    currentWeek = getCurrentWeekOfCycle(activeCycle.startDate)
    const weekTactics = activeCycle.objectives.flatMap((o) =>
      o.weeklyTactics.filter((t) => t.weekNumber === currentWeek)
    )
    const completed = weekTactics.filter((t) => t.completed).length
    weeklyScore = weekTactics.length > 0 ? Math.round((completed / weekTactics.length) * 100) : 0
  }

  // Notes due for review today
  const todayDate = new Date()
  todayDate.setHours(23, 59, 59, 999)
  const reviewsCount = await prisma.spacedRepetitionEntry.count({
    where: {
      nextReviewDate: { lte: todayDate },
      note: { front: { topic: { userId: user.id } } },
    },
  })

  // Stale Lifebook categories (> 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const staleCategories = await prisma.lifebookCategory.count({
    where: { userId: user.id, updatedAt: { lt: ninetyDaysAgo } },
  })

  return NextResponse.json({
    habits,
    habitsAlert,
    activeCycle,
    currentWeek,
    weeklyScore,
    reviewsCount,
    staleCategories,
    today,
  })
}
