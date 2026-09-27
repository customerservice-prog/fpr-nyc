export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateZoomSdkSignature } from '@/lib/zoom'

// Returns everything the admin dashboard needs to embed a live Zoom meeting
// directly in the page via Zoom's Meeting SDK for Web, instead of opening
// zoom.us in a new tab. Requires ZOOM_SDK_KEY and ZOOM_SDK_SECRET to be set.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const meeting = await prisma.meeting.findUnique({ where: { id } })
  if (!meeting || !meeting.zoomMeetingId) {
    return NextResponse.json({ error: 'No Zoom meeting is available for this booking yet.' }, { status: 404 })
  }

  const signature = generateZoomSdkSignature(meeting.zoomMeetingId, 1)
  if (!signature) {
    return NextResponse.json(
      { error: 'Zoom Meeting SDK is not configured yet (missing ZOOM_SDK_KEY/ZOOM_SDK_SECRET).' },
      { status: 501 }
    )
  }

  return NextResponse.json({
    signature,
    sdkKey: process.env.ZOOM_SDK_KEY,
    meetingNumber: meeting.zoomMeetingId,
    password: meeting.zoomPassword || '',
    userName: 'Friendly Party Rental NYC',
  })
}
