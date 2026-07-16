import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'

export function getPrisma(db: D1Database) {
  const adapter = new PrismaD1(db)
  return new PrismaClient({ adapter })
}
