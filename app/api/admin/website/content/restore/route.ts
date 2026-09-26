export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DRAFT_ID = 'hc_draft_1'

// POST: copy an older published revision's content back into the DRAFT only.
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
  if (!revisionId) return NextResponse.json({ error: 'revisionId required' }, { status: 400 })

  const revision = await prisma.homeContentRevision.findUnique({ where: { id: revisionId } })
  if (!revision) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })

  const draft = await prisma.homeContentDraft.upsert({
    where: { id: DRAFT_ID },
    update: {
      content: revision.content as any,
      baseRevisionNumber: revision.revisionNumber,
    },
    create: {
      id: DRAFT_ID,
      content: revision.content as any,
      baseRevisionNumber: revision.revisionNumber,
    },
  })

  return NextResponse.json({ draft })
}
