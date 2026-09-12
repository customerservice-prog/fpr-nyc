export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DRAFT_ID = 'hc_draft_1'

// POST: publish the current draft as a new, immutable HomeContentRevision.
// The previous "current" revision is kept in history (isCurrent=false),
// it is never deleted, so restoring an older revision is always possible.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const draft = await prisma.homeContentDraft.findUnique({ where: { id: DRAFT_ID } })
  if (!draft) {
    return NextResponse.json({ error: 'No draft found' }, { status: 404 })
  }

  const last = await prisma.homeContentRevision.findFirst({ orderBy: { revisionNumber: 'desc' } })
  const nextRevisionNumber = (last?.revisionNumber || 0) + 1

  const revision = await prisma.$transaction(async (tx) => {
    await tx.homeContentRevision.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } })
    const created = await tx.homeContentRevision.create({
      data: {
        revisionNumber: nextRevisionNumber,
        isCurrent: true,
        content: draft.content as any,
      },
    })
    await tx.homeContentDraft.update({
      where: { id: DRAFT_ID },
      data: { baseRevisionNumber: nextRevisionNumber },
    })
    return created
  })

  return NextResponse.json({ revision })
}
