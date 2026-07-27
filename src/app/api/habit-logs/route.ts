import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayString } from '@/lib/utils'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { habitId, date, completed } = await req.json()
  const logDate = date || getTodayString()

  const log = await prisma.habitLog.upsert({
    where: { habitId_date: { habitId, date: logDate } },
    update: { completed },
    create: { habitId, date: logDate, completed },
  })

  return NextResponse.json(log)
}
