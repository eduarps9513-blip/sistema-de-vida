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

  const visions = await prisma.vision.findMany({ where: { userId: user.id } })
  return NextResponse.json(visions)
}

export async function PUT(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, whereIWantToBe, whoIWantToBe, whatIWantToAchieve } = await req.json()
  if (!type) return NextResponse.json({ error: 'type requerido' }, { status: 400 })

  const vision = await prisma.vision.upsert({
    where: { userId_type: { userId: user.id, type } },
    update: { whereIWantToBe, whoIWantToBe, whatIWantToAchieve },
    create: {
      userId: user.id,
      type,
      whereIWantToBe: whereIWantToBe || '',
      whoIWantToBe: whoIWantToBe || '',
      whatIWantToAchieve: whatIWantToAchieve || '',
    },
  })
  return NextResponse.json(vision)
}
