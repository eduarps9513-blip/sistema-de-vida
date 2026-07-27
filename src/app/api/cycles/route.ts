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

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cycles = await prisma.twelveWeekCycle.findMany({
    where: { userId: user.id },
    include: {
      objectives: {
        include: { weeklyTactics: true, lifebookCategory: true },
        orderBy: { order: 'asc' },
      },
      weeklyReviews: true,
      closure: true,
    },
    orderBy: { startDate: 'desc' },
  })
  return NextResponse.json(cycles)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, startDate, endDate, totalWeeks } = await req.json()
  if (!name || !startDate) {
    return NextResponse.json({ error: 'Nombre y fecha de inicio son requeridos' }, { status: 400 })
  }

  const start = new Date(startDate)
  let end: Date
  let computedWeeks: number

  if (endDate) {
    end = new Date(endDate)
    const diffMs = Math.max(0, end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1
    computedWeeks = Math.max(1, Math.min(12, Math.ceil(diffDays / 7)))
  } else if (totalWeeks) {
    computedWeeks = Math.max(1, Math.min(12, Number(totalWeeks)))
    end = new Date(start)
    end.setDate(end.getDate() + computedWeeks * 7 - 1)
  } else {
    computedWeeks = 12
    end = new Date(start)
    end.setDate(end.getDate() + 12 * 7 - 1)
  }

  const cycle = await prisma.twelveWeekCycle.create({
    data: {
      userId: user.id,
      name,
      startDate: start,
      endDate: end,
      totalWeeks: computedWeeks,
    },
    include: { objectives: true },
  })

  return NextResponse.json(cycle)
}
