import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email y nueva contraseña requeridos' }, { status: 400 })
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanPassword = password.trim()

    const user = await prisma.user.findFirst({
      where: { email: cleanEmail },
    })

    if (!user) {
      // If user doesn't exist, create it
      const passwordHash = await bcrypt.hash(cleanPassword, 10)
      const newUser = await prisma.user.create({
        data: {
          name: 'Eduar Peña',
          email: cleanEmail,
          passwordHash,
          settings: { create: {} },
        },
      })
      return NextResponse.json({ success: true, message: 'Usuario creado y contraseña guardada' })
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al restablecer la contraseña' }, { status: 500 })
  }
}
