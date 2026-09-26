export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_HOME_CONTENT, HOME_CONTENT_KEYS } from '@/lib/homeContent'

const DRAFT_ID = 'home_draft_1'

const HERO_FIELDS = [
  'mobileImageUrl',
  'desktopImageUrl',
  'focalX',
  'focalY',
  'primaryActionType',
  'primaryActionValue',
  'primaryPosLeft',
  'primaryPosTop',
  'primaryPosWidth',
  'primaryPosHeight',
  'secondaryActionType',
  'secondaryActionValue',
  'secondaryPosLeft',
  'secondaryPosTop',
  'secondaryPosWidth',
  'secondaryPosHeight',
] as const

const DEFAULT_HERO = {
  mobileImageUrl: '/images/mobile-hero-event-scene-v4.png',
  desktopImageUrl: null,
  focalX: 0.5,
  focalY: 0.5,
  primaryActionType: 'NAVIGATE_PAGE',
  primaryActionValue: '/order-by-date',
  primaryPosLeft: 17.6,
  primaryPosTop: 35.8,
  primaryPosWidth: 35,
  primaryPosHeight: 6.7,
  secondaryActionType: 'NAVIGATE_PAGE',
  secondaryActionValue: '/category',
  secondaryPosLeft: 53.1,
  secondaryPosTop: 35.8,
  secondaryPosWidth: 30.4,
  secondaryPosHeight: 6.4,
}

// GET: return the single Home draft (auto-created from the current published
// revision if it does not exist yet) plus revision info for the UI.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let draft = await prisma.homeDraft.findUnique({ where: { id: DRAFT_ID } })
  if (!draft) {
    const current = await prisma.homeRevision.findFirst({ where: { isCurrent: true } })
    draft = await prisma.homeDraft.create({
      data: {
        id: DRAFT_ID,
        hero: (current?.hero as any) || DEFAULT_HERO,
        content: { ...DEFAULT_HOME_CONTENT, ...((current?.content as any) || {}) },
        baseRevisionNumber: current?.revisionNumber || 0,
      },
    })
  }

  const revisionCount = await prisma.homeRevision.count()
  const published = await prisma.homeRevision.findFirst({ where: { isCurrent: true } })
  return NextResponse.json({
    draft,
    revisionCount,
    publishedRevisionNumber: draft.baseRevisionNumber,
    published: published ? { hero: published.hero, content: published.content } : null,
  })
}

// PUT: update the draft's hero and/or content. Body shape: { hero?: {...}, content?: {...} }
// Only allowlisted hero fields and known content keys are accepted.
// This never touches HomeRevision, so production is unaffected until an admin publishes.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  let draft = await prisma.homeDraft.findUnique({ where: { id: DRAFT_ID } })
  if (!draft) {
    const current = await prisma.homeRevision.findFirst({ where: { isCurrent: true } })
    draft = await prisma.homeDraft.create({
      data: {
        id: DRAFT_ID,
        hero: (current?.hero as any) || DEFAULT_HERO,
        content: { ...DEFAULT_HOME_CONTENT, ...((current?.content as any) || {}) },
        baseRevisionNumber: current?.revisionNumber || 0,
      },
    })
  }

  const nextHero: Record<string, any> = { ...(draft.hero as any) }
  if (body.hero && typeof body.hero === 'object') {
    for (const field of HERO_FIELDS) {
      if (field in body.hero) nextHero[field] = body.hero[field]
    }
  }

  const nextContent: Record<string, any> = { ...(draft.content as any) }
  if (body.content && typeof body.content === 'object') {
    for (const key of HOME_CONTENT_KEYS) {
      if (key in body.content) nextContent[key] = body.content[key]
    }
  }

  const updated = await prisma.homeDraft.update({
    where: { id: DRAFT_ID },
    data: { hero: nextHero, content: nextContent },
  })

  return NextResponse.json({ draft: updated })
}
