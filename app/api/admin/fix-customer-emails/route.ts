export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function isPlaceholder(email: string | null | undefined) {
  if (!email) return true
  const e = email.trim()
  if (e === '') return true
  if (e.includes('@imported.friendlypartyrental.local')) return true
  if (e.startsWith('no-email-')) return true
  return false
}

function normalizePhone(phone: string | null | undefined) {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const all = await prisma.customer.findMany()

  const byPhone: Record<string, typeof all> = {}
  for (const c of all) {
    const norm = normalizePhone(c.phone)
    if (norm) {
      if (!byPhone[norm]) byPhone[norm] = []
      byPhone[norm].push(c)
    }
  }

  const placeholders = all.filter((c) => isPlaceholder(c.email))
  let fixed = 0
  const fixedList: { id: string; name: string; newEmail: string }[] = []
  const stillMissing: { id: string; name: string; phone: string | null }[] = []

  for (const p of placeholders) {
    const norm = normalizePhone(p.phone)
    const group = norm ? byPhone[norm] || [] : []
    const realMatch = group.find((g) => g.id !== p.id && !isPlaceholder(g.email))
    if (realMatch) {
      await prisma.customer.update({
        where: { id: p.id },
        data: { email: realMatch.email },
      })
      fixed++
      fixedList.push({ id: p.id, name: p.firstName + ' ' + p.lastName, newEmail: realMatch.email })
    } else {
      stillMissing.push({ id: p.id, name: p.firstName + ' ' + p.lastName, phone: p.phone })
    }
  }

  return NextResponse.json({
    totalCustomers: all.length,
    totalPlaceholders: placeholders.length,
    fixed,
    fixedList,
    stillMissingCount: stillMissing.length,
    stillMissing,
  })
}
