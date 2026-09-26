export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: list all Home revisions (history), newest first. A Home revision
// represents one published state of the whole Home page (hero + text
// together) - there is no separate history for hero vs. text.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const revisions = await prisma.homeRevision.findMany({
    orderBy: { revisionNumber: 'desc' },
    select: { id: true, revisionNumber: true, isCurrent: true, changeSummary: true, createdAt: true },
  })

  return NextResponse.json({ revisions })
}
