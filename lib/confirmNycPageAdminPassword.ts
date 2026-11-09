import { timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'

// Re-authenticate live page publication/deletion with the same admin identity
// allowed by the NYC NextAuth credentials provider. Never trust a client role.
export async function confirmNycPageAdminPassword(session: Session | null, password: unknown): Promise<boolean> {
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') return false
  if (typeof password !== 'string' || !password || password.length > 1024) return false
  const username = (session.user as { username?: string }).username || session.user.email || ''
  if (!username) return false

  const envUsername = process.env.ADMIN_USERNAME?.trim() || 'bryanp315'
  const envPassword = process.env.ADMIN_PASSWORD
  if (username === envUsername && envPassword) {
    const a = Buffer.from(password)
    const b = Buffer.from(envPassword)
    if (a.length === b.length && timingSafeEqual(a, b)) return true
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { password: true, role: true },
  })
  return Boolean(user?.role === 'admin' && await bcrypt.compare(password, user.password))
}
