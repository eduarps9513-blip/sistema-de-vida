import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getUser() {
  const session = await getServerSession(authOptions)
  const email = (session?.user as { email?: string })?.email
  if (!email) return null
  return prisma.user.findUnique({
    where: { email },
    include: { settings: true },
  })
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = user.settings
    ? {
        ...user.settings,
        openaiApiKey: user.settings.openaiApiKey ? '***configured***' : null,
      }
    : null

  return NextResponse.json({
    settings,
    user: { id: user.id, name: user.name, email: user.email },
  })
}

export async function PUT(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await req.json()
  const updateData: Record<string, unknown> = {}

  if (data.dailyChecklistTime !== undefined) updateData.dailyChecklistTime = data.dailyChecklistTime
  if (data.weeklyReviewDay !== undefined) updateData.weeklyReviewDay = data.weeklyReviewDay
  if (data.weeklyReviewTime !== undefined) updateData.weeklyReviewTime = data.weeklyReviewTime
  if (data.notificationsEnabled !== undefined) updateData.notificationsEnabled = data.notificationsEnabled
  if (data.openaiApiKey !== undefined && data.openaiApiKey !== '***configured***') {
    updateData.openaiApiKey = data.openaiApiKey || null
  }
  if (data.aiPromptTemplate !== undefined) updateData.aiPromptTemplate = data.aiPromptTemplate
  if (data.name !== undefined) {
    await prisma.user.update({ where: { id: user.id }, data: { name: data.name } })
  }

  const settings = await prisma.appSettings.upsert({
    where: { userId: user.id },
    update: updateData,
    create: { userId: user.id, ...updateData },
  })

  return NextResponse.json({
    ...settings,
    openaiApiKey: settings.openaiApiKey ? '***configured***' : null,
  })
}
