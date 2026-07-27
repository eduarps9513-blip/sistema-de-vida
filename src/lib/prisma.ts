import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

function prepareDatabaseUrl() {
  if (process.env.VERCEL) {
    try {
      const tmpDbPath = '/tmp/dev.db'
      const possibleSources = [
        path.join(process.cwd(), 'prisma', 'dev.db'),
        path.join(__dirname, '..', '..', 'prisma', 'dev.db'),
        path.resolve('./prisma/dev.db'),
      ]

      const sourcePath = possibleSources.find((p) => fs.existsSync(p))

      if (sourcePath) {
        if (!fs.existsSync(tmpDbPath) || fs.statSync(tmpDbPath).size === 0) {
          fs.copyFileSync(sourcePath, tmpDbPath)
        }
        return `file:${tmpDbPath}`
      }
    } catch (e) {
      console.error('Failed to prepare SQLite DB in /tmp:', e)
    }
  }
  return process.env.DATABASE_URL || 'file:./prisma/dev.db'
}

const dbUrl = prepareDatabaseUrl()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
