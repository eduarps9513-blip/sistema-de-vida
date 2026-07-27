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

export async function GET(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cycleId = searchParams.get('cycleId')
  if (!cycleId) return NextResponse.json([])

  const reviews = await prisma.weeklyReview.findMany({
    where: { cycleId },
    orderBy: { weekNumber: 'asc' },
  })
  return NextResponse.json(reviews)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cycleId, weekNumber, whatWorked, whatDidntWork, whatIAdjust, whoIReport, executionScore } =
    await req.json()

  const review = await prisma.weeklyReview.upsert({
    where: { cycleId_weekNumber: { cycleId, weekNumber } },
    update: { whatWorked, whatDidntWork, whatIAdjust, whoIReport, executionScore },
    create: {
      cycleId,
      weekNumber,
      whatWorked: whatWorked || '',
      whatDidntWork: whatDidntWork || '',
      whatIAdjust: whatIAdjust || '',
      whoIReport: whoIReport || '',
      executionScore: executionScore || 0,
    },
  })

  return NextResponse.json(review)
}
