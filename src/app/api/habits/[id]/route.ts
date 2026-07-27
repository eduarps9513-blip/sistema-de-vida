import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const data = await req.json()

  const habit = await prisma.habit.update({
    where: { id },
    data: {
      name: data.name,
      scheduledTime: data.scheduledTime ?? '',
      location: data.location ?? '',
      stackedAfter: data.stackedAfter || null,
      makeItObvious: data.makeItObvious ?? '',
      makeItAttractive: data.makeItAttractive ?? '',
      makeItEasy: data.makeItEasy ?? '',
      makeItSatisfying: data.makeItSatisfying ?? '',
      startWeek: data.startWeek ?? 1,
      status: data.status ?? 'ACTIVE',
      cycleId: data.cycleId || null,
    },
    include: { logs: { orderBy: { date: 'desc' }, take: 60 } },
  })

  return NextResponse.json(habit)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await prisma.habit.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
