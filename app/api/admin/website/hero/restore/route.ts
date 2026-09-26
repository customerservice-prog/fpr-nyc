export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DRAFT_ID = 'hh_draft_1'

// POST: copy an older published revision's fields back into the DRAFT only.
// This does NOT publish anything and does NOT delete or alter any
// existing revision history row. The admin must review the draft and
// click Publish afterwards to make the restored version live again.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { revisionId } = await req.json()
  if (!revisionId) return NextResponse.json({ error: 'revisionId is required' }, { status: 400 })

  const revision = await prisma.homeHeroRevision.findUnique({ where: { id: revisionId } })
  if (!revision) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })

  const draft = await prisma.homeHeroDraft.upsert({
    where: { id: DRAFT_ID },
    update: {
      mobileImageUrl: revision.mobileImageUrl,
      desktopImageUrl: revision.desktopImageUrl,
      focalX: revision.focalX,
      focalY: revision.focalY,
      primaryActionType: revision.primaryActionType,
      primaryActionValue: revision.primaryActionValue,
      primaryPosLeft: revision.primaryPosLeft,
      primaryPosTop: revision.primaryPosTop,
      primaryPosWidth: revision.primaryPosWidth,
      primaryPosHeight: revision.primaryPosHeight,
      secondaryActionType: revision.secondaryActionType,
      secondaryActionValue: revision.secondaryActionValue,
      secondaryPosLeft: revision.secondaryPosLeft,
      secondaryPosTop: revision.secondaryPosTop,
      secondaryPosWidth: revision.secondaryPosWidth,
      secondaryPosHeight: revision.secondaryPosHeight,
    },
    create: {
      id: DRAFT_ID,
      mobileImageUrl: revision.mobileImageUrl,
      desktopImageUrl: revision.desktopImageUrl,
      focalX: revision.focalX,
      focalY: revision.focalY,
      primaryActionType: revision.primaryActionType,
      primaryActionValue: revision.primaryActionValue,
      primaryPosLeft: revision.primaryPosLeft,
      primaryPosTop: revision.primaryPosTop,
      primaryPosWidth: revision.primaryPosWidth,
      primaryPosHeight: revision.primaryPosHeight,
      secondaryActionType: revision.secondaryActionType,
      secondaryActionValue: revision.secondaryActionValue,
      secondaryPosLeft: revision.secondaryPosLeft,
      secondaryPosTop: revision.secondaryPosTop,
      secondaryPosWidth: revision.secondaryPosWidth,
      secondaryPosHeight: revision.secondaryPosHeight,
      baseRevisionNumber: revision.revisionNumber,
    },
  })

  return NextResponse.json({ draft })
}
