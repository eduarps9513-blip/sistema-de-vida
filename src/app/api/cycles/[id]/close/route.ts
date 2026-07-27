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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { achievedResults, learnings, objectivesToRepeat, objectivesToDiscard } = await req.json()

  const cycle = await prisma.twelveWeekCycle.findFirst({
    where: { id, userId: user.id },
    include: {
      objectives: { include: { weeklyTactics: true } },
    },
  })

  if (!cycle) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Calculate execution %
  const allTactics = cycle.objectives.flatMap((o) => o.weeklyTactics)
  const totalTactics = allTactics.length
  const completedTactics = allTactics.filter((t) => t.completed).length
  const executionPercent =
    totalTactics > 0 ? Math.round((completedTactics / totalTactics) * 100) : 0

  const repeatNames = ((objectivesToRepeat as string[]) || [])
    .map((objId) => cycle.objectives.find((o) => o.id === objId)?.name)
    .filter(Boolean)
    .join(', ')

  const discardNames = ((objectivesToDiscard as string[]) || [])
    .map((objId) => cycle.objectives.find((o) => o.id === objId)?.name)
    .filter(Boolean)
    .join(', ')

  const performanceText =
    executionPercent >= 85
      ? '¡Excelente rendimiento!'
      : executionPercent >= 60
      ? 'Buen esfuerzo, hay margen de mejora.'
      : 'Ciclo retador. Los aprendizajes son valiosos.'

  const autoSummary = `📊 CIERRE DE CICLO: "${cycle.name}"\n\n` +
    `✅ Ejecución total: ${executionPercent}% (${completedTactics} de ${totalTactics} tácticas). ${performanceText}\n\n` +
    `🏆 Resultados logrados:\n${achievedResults || 'No especificado'}\n\n` +
    `💡 Aprendizajes clave:\n${learnings || 'No especificado'}\n\n` +
    (repeatNames ? `🔄 Objetivos a repetir en el próximo ciclo: ${repeatNames}\n\n` : '') +
    (discardNames ? `🗑 Objetivos descartados: ${discardNames}\n\n` : '') +
    `📅 Fechas: ${new Date(cycle.startDate).toLocaleDateString('es-ES')} — ${new Date(cycle.endDate).toLocaleDateString('es-ES')}`

  const closure = await prisma.cycleClosure.upsert({
    where: { cycleId: id },
    update: {
      achievedResults: achievedResults || '',
      learnings: learnings || '',
      executionPercent,
      objectivesToRepeat: JSON.stringify(objectivesToRepeat || []),
      objectivesToDiscard: JSON.stringify(objectivesToDiscard || []),
      autoSummary,
    },
    create: {
      cycleId: id,
      achievedResults: achievedResults || '',
      learnings: learnings || '',
      executionPercent,
      objectivesToRepeat: JSON.stringify(objectivesToRepeat || []),
      objectivesToDiscard: JSON.stringify(objectivesToDiscard || []),
      autoSummary,
    },
  })

  await prisma.twelveWeekCycle.update({
    where: { id },
    data: { status: 'CLOSED', closureSummary: autoSummary },
  })

  return NextResponse.json({ closure, executionPercent, autoSummary })
}
