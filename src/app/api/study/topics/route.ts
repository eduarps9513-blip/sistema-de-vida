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

  const topics = await prisma.studyTopic.findMany({
    where: { userId: user.id },
    include: {
      fronts: {
        include: {
          _count: { select: { notes: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(topics)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description } = await req.json()
  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const topic = await prisma.studyTopic.create({
    data: { userId: user.id, name, description: description || null },
    include: { fronts: true },
  })
  return NextResponse.json(topic)
}

export async function DELETE(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await prisma.studyTopic.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
