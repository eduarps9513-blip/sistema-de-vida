import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMentalImageAndFlashcard } from '@/lib/openai'

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { settings: true },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const note = await prisma.studyNote.findUnique({ where: { id } })
  if (!note) return NextResponse.json({ error: 'Nota no encontrada' }, { status: 404 })

  const apiKeyToUse = user.settings?.openaiApiKey || process.env.OPENAI_API_KEY
  let mentalImageText: string | null = null
  let flashcardText: string | null = null

  if (apiKeyToUse) {
    try {
      const result = await generateMentalImageAndFlashcard(
        note.content,
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

  if (!mentalImageText) {
    mentalImageText = `Palacio de la Memoria (Escena Visual): Imagina una gran pantalla transparente de luz dorada. En ella aparece esculpido el concepto: "${note.content.slice(0, 80)}${note.content.length > 80 ? '...' : ''}". Cada detalle visual se conecta con destellos brillantes para fijarlo fácilmente.`
    flashcardText = note.flashcard || `¿Cuál es el concepto clave de esta nota?`
  }

  const updated = await prisma.studyNote.update({
    where: { id },
    data: {
      mentalImage: mentalImageText,
      flashcard: flashcardText,
      mentalImageEdited: false,
    },
    include: { spacedRepetition: true },
  })

  return NextResponse.json(updated)
}
