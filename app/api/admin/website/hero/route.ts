export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DRAFT_ID = 'hh_draft_1'

const EDITABLE_FIELDS = [
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

// GET: return the current draft (auto-created from the published revision
// if it does not exist yet) plus basic revision info for the UI.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let draft = await prisma.homeHeroDraft.findUnique({ where: { id: DRAFT_ID } })

  if (!draft) {
    const current = await prisma.homeHeroRevision.findFirst({ where: { isCurrent: true } })
    draft = await prisma.homeHeroDraft.create({
      data: {
        id: DRAFT_ID,
        mobileImageUrl: current?.mobileImageUrl ?? '/images/mobile-hero-event-scene-v4.png',
        desktopImageUrl: current?.desktopImageUrl ?? null,
        focalX: current?.focalX ?? 0.5,
        focalY: current?.focalY ?? 0.5,
        primaryActionType: current?.primaryActionType ?? 'NAVIGATE_PAGE',
        primaryActionValue: current?.primaryActionValue ?? '/order-by-date',
        primaryPosLeft: current?.primaryPosLeft ?? 17.6,
        primaryPosTop: current?.primaryPosTop ?? 35.8,
        primaryPosWidth: current?.primaryPosWidth ?? 35,
        primaryPosHeight: current?.primaryPosHeight ?? 6.7,
        secondaryActionType: current?.secondaryActionType ?? 'NAVIGATE_PAGE',
        secondaryActionValue: current?.secondaryActionValue ?? '/category',
        secondaryPosLeft: current?.secondaryPosLeft ?? 53.1,
        secondaryPosTop: current?.secondaryPosTop ?? 35.8,
        secondaryPosWidth: current?.secondaryPosWidth ?? 30.4,
        secondaryPosHeight: current?.secondaryPosHeight ?? 6.4,
        baseRevisionNumber: current?.revisionNumber ?? 0,
      },
    })
  }

  const revisionCount = await prisma.homeHeroRevision.count()

  return NextResponse.json({ draft, revisionCount, publishedRevisionNumber: draft.baseRevisionNumber })
}

// PUT: update only the allowlisted presentation fields on the draft.
// This never touches HomeHeroRevision, so production is unaffected
// until an admin explicitly publishes.
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const data: Record<string, any> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field]
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  const draft = await prisma.homeHeroDraft.upsert({
    where: { id: DRAFT_ID },
    update: data,
    create: { id: DRAFT_ID, ...data } as any,
  })

  return NextResponse.json({ draft })
}
