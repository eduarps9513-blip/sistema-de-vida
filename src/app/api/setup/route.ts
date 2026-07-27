import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { LIFEBOOK_CATEGORIES } from '@/lib/utils'

export async function GET() {
  const count = await prisma.user.count()
  return NextResponse.json({ hasUser: count > 0 })
}

export async function POST(req: Request) {
  const count = await prisma.user.count()
  if (count > 0) {
    return NextResponse.json({ error: 'Ya existe un usuario' }, { status: 400 })
  }

  const { name, email, password } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      settings: { create: {} },
    },
  })

  // Create 12 Lifebook categories
  await prisma.lifebookCategory.createMany({
    data: LIFEBOOK_CATEGORIES.map((cat) => ({
      userId: user.id,
      slug: cat.slug,
    })),
  })

  // Create empty visions
  await prisma.vision.createMany({
    data: [
      { userId: user.id, type: 'THREE_YEAR' },
      { userId: user.id, type: 'FIVE_YEAR' },
    ],
  })

  return NextResponse.json({ success: true })
}
