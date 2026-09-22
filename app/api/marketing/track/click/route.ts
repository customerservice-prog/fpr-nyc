export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyMarketingTrackingToken } from '@/lib/marketing/tracking'

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('t') || ''
  const payload = verifyMarketingTrackingToken(token, 'click')
  if (!payload?.url) return NextResponse.json({ error: 'Invalid tracking link' }, { status: 400 })

  let target: URL
  try {
    target = new URL(payload.url)
    if (!/^https?:$/.test(target.protocol)) throw new Error('Unsupported protocol')
  } catch {
    return NextResponse.json({ error: 'Invalid destination' }, { status: 400 })
  }

  try {
    const send = await prisma.marketingSendLog.findFirst({
      where: {
        campaignSlug: payload.campaignSlug,
        email: { equals: payload.email, mode: 'insensitive' },
        ...(payload.runId ? { runId: payload.runId } : {}),
      },
      orderBy: { sentAt: 'desc' },
      select: { id: true, clickedAt: true },
    })
    if (send) {
      const now = new Date()
      await prisma.marketingSendLog.update({
        where: { id: send.id },
        data: {
          clickCount: { increment: 1 },
          clickedAt: send.clickedAt || now,
          lastClickedAt: now,
          lastClickedUrl: target.toString().slice(0, 2000),
        },
      })
    }
  } catch (error) {
    console.error('Marketing click tracking failed:', error)
  }

  return NextResponse.redirect(target, 302)
}
