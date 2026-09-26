export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DRAFT_ID = 'hh_draft_1'

// POST: publish the current draft as a new, immutable HomeHeroRevision.
// The previous "current" revision is kept in history (isCurrent=false),
// it is never deleted, so restoring an older revision is always possible.
export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

  const draft = await prisma.homeHeroDraft.findUnique({ where: { id: DRAFT_ID } })
    if (!draft) {
          return NextResponse.json({ error: 'No draft found' }, { status: 404 })
    }

  const last = await prisma.homeHeroRevision.findFirst({ orderBy: { revisionNumber: 'desc' } })
    const nextRevisionNumber = (last?.revisionNumber || 0) + 1

  const revision = await prisma.$transaction(async (tx) => {
        await tx.homeHeroRevision.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } })
        const created = await tx.homeHeroRevision.create({
                data: {
                          revisionNumber: nextRevisionNumber,
                          isCurrent: true,
                          mobileImageUrl: draft.mobileImageUrl,
                          desktopImageUrl: draft.desktopImageUrl,
                          focalX: draft.focalX,
                          focalY: draft.focalY,
                          primaryActionType: draft.primaryActionType,
                          primaryActionValue: draft.primaryActionValue,
                          primaryPosLeft: draft.primaryPosLeft,
                          primaryPosTop: draft.primaryPosTop,
                          primaryPosWidth: draft.primaryPosWidth,
                          primaryPosHeight: draft.primaryPosHeight,
                          secondaryActionType: draft.secondaryActionType,
                          secondaryActionValue: draft.secondaryActionValue,
                          secondaryPosLeft: draft.secondaryPosLeft,
                          secondaryPosTop: draft.secondaryPosTop,
                          secondaryPosWidth: draft.secondaryPosWidth,
                          secondaryPosHeight: draft.secondaryPosHeight,
                          changeSummary: 'Published from Website Edit Mode',
                },
        })
        await tx.homeHeroDraft.update({
                where: { id: DRAFT_ID },
                data: { baseRevisionNumber: nextRevisionNumber },
        })
        return created
  })

  return NextResponse.json({ revision })
}
