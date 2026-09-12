export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: list published HomeHeroRevision history, newest first.
// Used by the Website Edit Mode history panel to allow admins
// to see and restore previous published versions of the hero.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const revisions = await prisma.homeHeroRevision.findMany({
    orderBy: { revisionNumber: 'desc' },
    select: {
      id: true,
      revisionNumber: true,
      isCurrent: true,
      changeSummary: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ revisions })
}
