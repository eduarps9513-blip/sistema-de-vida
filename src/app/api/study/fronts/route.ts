import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const topicId = searchParams.get('topicId')
  if (!topicId) return NextResponse.json([])

  const fronts = await prisma.studyFront.findMany({
    where: { topicId },
    include: {
      notes: {
        select: {
          id: true,
          createdAt: true,
          mentalImage: true,
          flashcard: true,
          spacedRepetition: { select: { nextReviewDate: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(fronts)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { topicId, name, description } = await req.json()
  if (!name || !topicId) {
    return NextResponse.json({ error: 'Nombre y tema requeridos' }, { status: 400 })
  }

  const front = await prisma.studyFront.create({
    data: { topicId, name, description: description || null },
    include: { notes: true },
  })
  return NextResponse.json(front)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await prisma.studyFront.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
