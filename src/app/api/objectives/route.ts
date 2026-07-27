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

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    cycleId,
    name,
    lagMeasure,
    leadMeasure,
    lifebookCategoryId,
    linkedVision3,
    linkedVision5,
  } = await req.json()

  if (!name || !cycleId) {
    return NextResponse.json({ error: 'Nombre y ciclo son requeridos' }, { status: 400 })
  }

  // Find cycle to get its total weeks
  const cycle = await prisma.twelveWeekCycle.findUnique({ where: { id: cycleId } })
  const weeksCount = cycle?.totalWeeks || 12

  // Enforce max 4 objectives rule
  const existingCount = await prisma.objective.count({ where: { cycleId } })
  if (existingCount >= 4) {
    return NextResponse.json(
      { error: 'Máximo 4 objetivos por ciclo. La dispersión mata la ejecución.' },
      { status: 400 }
    )
  }

  // Lookup Lifebook category by ID or by slug safely
  let categoryIdToLink: string | null = null
  if (lifebookCategoryId) {
    const foundCat = await prisma.lifebookCategory.findFirst({
      where: {
        userId: user.id,
        OR: [{ id: lifebookCategoryId }, { slug: lifebookCategoryId }],
      },
    })
    if (foundCat) categoryIdToLink = foundCat.id
  }

  const objective = await prisma.objective.create({
    data: {
      cycleId,
      name,
      lagMeasure: lagMeasure || '',
      leadMeasure: leadMeasure || '',
      lifebookCategoryId: categoryIdToLink,
      linkedVision3: linkedVision3 ?? false,
      linkedVision5: linkedVision5 ?? false,
      order: existingCount,
      weeklyTactics: {
        createMany: {
          data: Array.from({ length: weeksCount }, (_, i) => ({
            weekNumber: i + 1,
            description: '',
          })),
        },
      },
    },
    include: {
      weeklyTactics: { orderBy: { weekNumber: 'asc' } },
      lifebookCategory: true,
    },
  })

  return NextResponse.json(objective)
}

export async function PUT(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, name, lagMeasure, leadMeasure, lifebookCategoryId, linkedVision3, linkedVision5 } =
    await req.json()

  let categoryIdToLink: string | null = null
  if (lifebookCategoryId) {
    const foundCat = await prisma.lifebookCategory.findFirst({
      where: {
        userId: user.id,
        OR: [{ id: lifebookCategoryId }, { slug: lifebookCategoryId }],
      },
    })
    if (foundCat) categoryIdToLink = foundCat.id
  }

  const objective = await prisma.objective.update({
    where: { id },
    data: {
      name,
      lagMeasure,
      leadMeasure,
      lifebookCategoryId: categoryIdToLink,
      linkedVision3: linkedVision3 ?? false,
      linkedVision5: linkedVision5 ?? false,
    },
    include: {
      weeklyTactics: { orderBy: { weekNumber: 'asc' } },
      lifebookCategory: true,
    },
  })

  return NextResponse.json(objective)
}

export async function DELETE(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await prisma.objective.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
