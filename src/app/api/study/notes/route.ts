import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMentalImageAndFlashcard } from '@/lib/openai'
import { getInitialEntry } from '@/lib/spaced-repetition'

async function getUser() {
  const session = await getServerSession(authOptions)
  const email = (session?.user as { email?: string })?.email
  if (!email) return null
  return prisma.user.findUnique({
    where: { email },
    include: { settings: true },
  })
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const frontId = searchParams.get('frontId')
  if (!frontId) return NextResponse.json([])

  const notes = await prisma.studyNote.findMany({
    where: { frontId },
    include: { spacedRepetition: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(notes)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { frontId, content } = await req.json()
  if (!content || !frontId) {
    return NextResponse.json({ error: 'Contenido y frente son requeridos' }, { status: 400 })
  }

  const apiKeyToUse = user.settings?.openaiApiKey || process.env.OPENAI_API_KEY
  let mentalImageText: string | null = null
  let flashcardText: string | null = null

  if (apiKeyToUse) {
    try {
      const result = await generateMentalImageAndFlashcard(
        content,
        user.settings?.aiPromptTemplate || '',
        apiKeyToUse
      )
      if (result) {
        mentalImageText = result.mentalImage
        flashcardText = result.flashcard
      }
    } catch (e) {
      console.error('Error generating AI text:', e)
    }
  }

  // Fallback description if no API Key or call failed
  if (!mentalImageText) {
    mentalImageText = `Palacio de la Memoria (Escena Visual): Visualiza una habitación brillante con paredes de cristal violeta. En el centro, una valla publicitaria dorada destaca el concepto principal: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}". Cada palabra emite un destello de luz neón que fija la idea firmemente en tu memoria.`
    flashcardText = `¿Cuál es el concepto clave de esta nota?`
  }

  const srEntry = getInitialEntry()

  const note = await prisma.studyNote.create({
    data: {
      frontId,
      content,
      mentalImage: mentalImageText,
      flashcard: flashcardText,
      spacedRepetition: {
        create: {
          interval: srEntry.interval,
          easeFactor: srEntry.easeFactor,
          repetitions: srEntry.repetitions,
          nextReviewDate: srEntry.nextReviewDate,
        },
      },
    },
    include: { spacedRepetition: true },
  })

  return NextResponse.json(note)
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, content, mentalImage, mentalImageEdited } = await req.json()

  const note = await prisma.studyNote.update({
    where: { id },
    data: {
      ...(content !== undefined && { content }),
      ...(mentalImage !== undefined && { mentalImage }),
      ...(mentalImageEdited !== undefined && { mentalImageEdited }),
    },
    include: { spacedRepetition: true },
  })

  return NextResponse.json(note)
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  await prisma.studyNote.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
