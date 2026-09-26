export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DRAFT_ID = 'home_draft_1'

// POST: restore an older Home revision. This copies that revision's hero +
// content into the draft AND immediately publishes it as a brand new
// revision on top of history (it does NOT delete or alter any existing
// revision row - the old revisions remain in history exactly as they were).
// Hero and text always restore together, since they are one Home page.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { revisionId } = await req.json()
  if (!revisionId) return NextResponse.json({ error: 'revisionId is required' }, { status: 400 })

  const target = await prisma.homeRevision.findUnique({ where: { id: revisionId } })
  if (!target) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })

  const last = await prisma.homeRevision.findFirst({ orderBy: { revisionNumber: 'desc' } })
  const nextRevisionNumber = (last?.revisionNumber || 0) + 1

  const revision = await prisma.$transaction(async (tx) => {
    await tx.homeRevision.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } })
    const created = await tx.homeRevision.create({
      data: {
        revisionNumber: nextRevisionNumber,
        isCurrent: true,
        hero: target.hero as any,
        content: target.content as any,
        changeSummary: `Restored from revision #${target.revisionNumber}`,
      },
    })
    await tx.homeDraft.upsert({
      where: { id: DRAFT_ID },
      update: { hero: target.hero as any, content: target.content as any, baseRevisionNumber: nextRevisionNumber },
      create: { id: DRAFT_ID, hero: target.hero as any, content: target.content as any, baseRevisionNumber: nextRevisionNumber },
    })
    return created
  })

  return NextResponse.json({ revision })
}
