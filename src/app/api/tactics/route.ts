import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { objectiveId, weekNumber, description } = await req.json()
  if (!objectiveId || !weekNumber) {
    return NextResponse.json({ error: 'Objetivo y número de semana requeridos' }, { status: 400 })
  }

  const tactic = await prisma.weeklyTactic.create({
    data: {
      objectiveId,
      weekNumber: Number(weekNumber),
      description: description || '',
      completed: false,
    },
  })

  return NextResponse.json(tactic)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, description, completed, weekNumber } = await req.json()

  const tactic = await prisma.weeklyTactic.update({
    where: { id },
    data: {
      ...(description !== undefined && { description }),
      ...(completed !== undefined && { completed }),
      ...(weekNumber !== undefined && { weekNumber: Number(weekNumber) }),
    },
  })

  return NextResponse.json(tactic)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()

  // 1. Delete all daily tasks originated from this tactic so they don't stay in "Hoy"
  await prisma.dailyTask.deleteMany({
    where: {
      sourceType: 'TACTIC',
      sourceId: id,
    },
  })

  // 2. Delete the weekly tactic
  await prisma.weeklyTactic.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
