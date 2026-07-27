import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayString, getCurrentWeekOfCycle } from '@/lib/utils'

async function getUser() {
  const session = await getServerSession(authOptions)
  const email = (session?.user as { email?: string })?.email
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

export async function GET(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date') || getTodayString()

  const tasks = await prisma.dailyTask.findMany({
    where: { userId: user.id, date },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, date, sourceType, sourceId, objectiveId, weekNumber } = await req.json()
  if (!title) return NextResponse.json({ error: 'Título requerido' }, { status: 400 })

  const taskDate = date || getTodayString()
  let finalSourceType = sourceType || 'CUSTOM'
  let finalSourceId = sourceId || null

  // If linking directly to an objective, create WeeklyTactic first
  if (objectiveId) {
    const objective = await prisma.objective.findUnique({
      where: { id: objectiveId },
      include: { cycle: true },
    })

    if (objective) {
      const weekNum = weekNumber
        ? Number(weekNumber)
        : getCurrentWeekOfCycle(objective.cycle.startDate)

      const createdTactic = await prisma.weeklyTactic.create({
        data: {
          objectiveId,
          weekNumber: Math.max(1, Math.min(objective.cycle.totalWeeks || 12, weekNum)),
          description: title,
          completed: false,
        },
      })
      finalSourceType = 'TACTIC'
      finalSourceId = createdTactic.id
    }
  }

  const task = await prisma.dailyTask.create({
    data: {
      userId: user.id,
      title,
      date: taskDate,
      sourceType: finalSourceType,
      sourceId: finalSourceId,
    },
  })

  return NextResponse.json(task)
}

export async function PUT(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, completed, title, date } = await req.json()

  const task = await prisma.dailyTask.update({
    where: { id },
    data: {
      ...(completed !== undefined && { completed }),
      ...(title !== undefined && { title }),
      ...(date !== undefined && { date }),
    },
  })

  // Synchronize underlying WeeklyTactic if task originated from an Objective Tactic
  if (task.sourceType === 'TACTIC' && task.sourceId && completed !== undefined) {
    try {
      await prisma.weeklyTactic.update({
        where: { id: task.sourceId },
        data: { completed },
      })
    } catch (err) {
      console.error('Error syncing weekly tactic status:', err)
    }
  }

  return NextResponse.json(task)
}

export async function DELETE(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()

  await prisma.dailyTask.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
