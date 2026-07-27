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

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const cycle = await prisma.twelveWeekCycle.findFirst({
    where: { id, userId: user.id },
    include: {
      objectives: {
        include: {
          weeklyTactics: { orderBy: { weekNumber: 'asc' } },
          lifebookCategory: true,
        },
        orderBy: { order: 'asc' },
      },
      weeklyReviews: { orderBy: { weekNumber: 'asc' } },
      closure: true,
    },
  })

  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(cycle)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await prisma.twelveWeekCycle.deleteMany({
    where: { id, userId: user.id },
  })
  return NextResponse.json({ success: true })
}
