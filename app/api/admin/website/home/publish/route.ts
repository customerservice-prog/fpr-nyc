export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DRAFT_ID = 'home_draft_1'

function diffFields(prev: any, next: any, prefix: string): string[] {
  if (!prev || !next) return []
  const changed: string[] = []
  for (const key of Object.keys(next)) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) changed.push(`${prefix}.${key}`)
  }
  return changed
}

// POST: publish the current draft (hero + content together) as a new,
// immutable HomeRevision. The previous "current" revision is kept in
// history (isCurrent=false), it is never deleted, so restoring an older
// revision is always possible. This is the SINGLE publish action for the
// whole Home page - hero and text changes go live together, atomically.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const draft = await prisma.homeDraft.findUnique({ where: { id: DRAFT_ID } })
  if (!draft) {
    return NextResponse.json({ error: 'No draft found' }, { status: 404 })
  }

  const last = await prisma.homeRevision.findFirst({ orderBy: { revisionNumber: 'desc' } })
  const nextRevisionNumber = (last?.revisionNumber || 0) + 1
  const changedFields = [
    ...diffFields(last?.hero, draft.hero, 'hero'),
    ...diffFields(last?.content, draft.content, 'content'),
  ]
  const changeSummary = changedFields.length ? changedFields.join(', ') : 'No changes from previous revision'

  const revision = await prisma.$transaction(async (tx) => {
    await tx.homeRevision.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } })
    const created = await tx.homeRevision.create({
      data: {
        revisionNumber: nextRevisionNumber,
        isCurrent: true,
        hero: draft.hero as any,
        content: draft.content as any,
        changeSummary,
      },
    })
    await tx.homeDraft.update({ where: { id: DRAFT_ID }, data: { baseRevisionNumber: nextRevisionNumber } })
    return created
  })

  return NextResponse.json({ revision, changedFields })
}
