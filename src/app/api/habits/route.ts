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

  const habits = await prisma.habit.findMany({
    where: { userId: user.id },
    include: {
      logs: { orderBy: { date: 'desc' }, take: 60 },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(habits)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  if (!data.name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const habit = await prisma.habit.create({
    data: {
      userId: user.id,
      name: data.name,
      scheduledTime: data.scheduledTime || '',
      location: data.location || '',
      stackedAfter: data.stackedAfter || null,
      makeItObvious: data.makeItObvious || '',
      makeItAttractive: data.makeItAttractive || '',
      makeItEasy: data.makeItEasy || '',
      makeItSatisfying: data.makeItSatisfying || '',
      startWeek: data.startWeek || 1,
      cycleId: data.cycleId || null,
    },
    include: { logs: true },
  })

  return NextResponse.json(habit)
}
