export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_HOME_CONTENT, HOME_CONTENT_KEYS } from '@/lib/homeContent'

const DRAFT_ID = 'hc_draft_1'

const ALLOWED_KEYS = HOME_CONTENT_KEYS

// GET: return the current draft (auto-created from the current published
// revision, or from defaults if no revision exists yet) plus revision info.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let current = await prisma.homeContentRevision.findFirst({ where: { isCurrent: true } })
  if (!current) {
    current = await prisma.homeContentRevision.create({
      data: { revisionNumber: 1, isCurrent: true, content: DEFAULT_HOME_CONTENT },
    })
  }

  let draft = await prisma.homeContentDraft.findUnique({ where: { id: DRAFT_ID } })
  if (!draft) {
    draft = await prisma.homeContentDraft.create({
      data: {
        id: DRAFT_ID,
        content: current.content as any,
        baseRevisionNumber: current.revisionNumber,
      },
    })
  }

  const revisionCount = await prisma.homeContentRevision.count()
  return NextResponse.json({ draft, revisionCount, publishedRevisionNumber: draft.baseRevisionNumber })
}

// PUT: merge allowlisted keys into the draft's content JSON.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Record<string, string> = {}
  for (const key of ALLOWED_KEYS) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  const existing = await prisma.homeContentDraft.findUnique({ where: { id: DRAFT_ID } })
  const baseContent = (existing?.content as Record<string, string>) || DEFAULT_HOME_CONTENT
  const mergedContent = { ...baseContent, ...updates }

  const draft = await prisma.homeContentDraft.upsert({
    where: { id: DRAFT_ID },
    update: { content: mergedContent },
    create: { id: DRAFT_ID, content: mergedContent },
  })

  return NextResponse.json({ draft })
}
