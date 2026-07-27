import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

if (process.env.VERCEL) {
  try {
    const tmpDbPath = '/tmp/dev.db'
    if (!fs.existsSync(tmpDbPath)) {
      const sourceDbPath = path.join(process.cwd(), 'prisma', 'dev.db')
      if (fs.existsSync(sourceDbPath)) {
        fs.copyFileSync(sourceDbPath, tmpDbPath)
      }
    }
    process.env.DATABASE_URL = `file:${tmpDbPath}`
  } catch (e) {
    console.error('Failed to copy SQLite DB to /tmp:', e)
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
