import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSM2 } from '@/lib/spaced-repetition'

async function getUser() {
  const session = await getServerSession(authOptions)
  const email = (session?.user as { email?: string })?.email
  if (!email) return null
  return prisma.user.findUnique({ where: { email } })
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const entries = await prisma.spacedRepetitionEntry.findMany({
    where: {
      nextReviewDate: { lte: today },
      note: {
        front: {
          topic: { userId: user.id },
        },
      },
    },
    include: {
      note: {
        include: {
          front: { include: { topic: true } },
          spacedRepetition: true,
        },
      },
    },
    orderBy: { nextReviewDate: 'asc' },
  })

  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { entryId, quality } = await req.json()

  const entry = await prisma.spacedRepetitionEntry.findUnique({
    where: { id: entryId },
  })
  if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const result = calculateSM2(quality, entry.repetitions, entry.easeFactor, entry.interval)

  const updated = await prisma.spacedRepetitionEntry.update({
    where: { id: entryId },
    data: {
      interval: result.interval,
      easeFactor: result.easeFactor,
      repetitions: result.repetitions,
      nextReviewDate: result.nextReviewDate,
      lastReviewDate: new Date(),
      logs: {
        create: {
          quality,
          newInterval: result.interval,
          reviewDate: new Date(),
        },
      },
    },
  })

  return NextResponse.json({ ...updated, newInterval: result.interval })
}
