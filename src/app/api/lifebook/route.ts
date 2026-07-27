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

  const categories = await prisma.lifebookCategory.findMany({
    where: { userId: user.id },
  })
  return NextResponse.json(categories)
}

export async function PUT(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug, currentBeliefs, idealVision, whyIWantIt, howIWillAchieveIt, linkedVision3, linkedVision5 } =
    await req.json()

  const category = await prisma.lifebookCategory.upsert({
    where: { userId_slug: { userId: user.id, slug } },
    update: { currentBeliefs, idealVision, whyIWantIt, howIWillAchieveIt, linkedVision3, linkedVision5 },
    create: {
      userId: user.id,
      slug,
      currentBeliefs: currentBeliefs || '',
      idealVision: idealVision || '',
      whyIWantIt: whyIWantIt || '',
      howIWillAchieveIt: howIWillAchieveIt || '',
      linkedVision3: linkedVision3 ?? false,
      linkedVision5: linkedVision5 ?? false,
    },
  })
  return NextResponse.json(category)
}
