export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMarketingTrackingToken } from '@/lib/marketing/tracking'

const PIXEL = Uint8Array.from(Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64'))

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('t') || ''
  const payload = verifyMarketingTrackingToken(token, 'open')
  if (payload) {
    try {
      const send = await prisma.marketingSendLog.findFirst({
        where: {
          campaignSlug: payload.campaignSlug,
          email: { equals: payload.email, mode: 'insensitive' },
          ...(payload.runId ? { runId: payload.runId } : {}),
        },
        orderBy: { sentAt: 'desc' },
        select: { id: true, openedAt: true },
      })
      if (send) {
        const now = new Date()
        await prisma.marketingSendLog.update({
          where: { id: send.id },
          data: { openCount: { increment: 1 }, openedAt: send.openedAt || now, lastOpenedAt: now },
        })
      }
    } catch (error) {
      console.error('Marketing open tracking failed:', error)
    }
  }
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private, max-age=0',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
