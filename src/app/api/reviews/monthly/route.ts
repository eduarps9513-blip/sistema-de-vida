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

  const reviews = await prisma.monthlyReview.findMany({
    where: { userId: user.id },
    include: { lifebookCategory: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })
  return NextResponse.json(reviews)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { month, year, lifebookCategoryId, notes } = await req.json()

  const review = await prisma.monthlyReview.create({
    data: {
      userId: user.id,
      month,
      year,
      lifebookCategoryId,
      notes: notes || '',
    },
    include: { lifebookCategory: true },
  })

  return NextResponse.json(review)
}
