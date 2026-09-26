export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { createZoomMeeting } from '@/lib/zoom'
import { sendEmail, meetingInviteEmail } from '@/lib/email'
import { BUSINESS } from '@/lib/utils'

// The admin enters a meeting time as a plain wall-clock value (no timezone,
// e.g. from a <input type="datetime-local">). We store and later display that
// exact value using UTC getters so it is never silently shifted by the
// server's or the viewer's local timezone.
function parseWallClockAsUtc(value: string): Date {
  const hasTimezone = /Z$|[+-]\d\d:\d\d$/.test(value)
  return new Date(hasTimezone ? value : value + 'Z')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const meetings = await prisma.meeting.findMany({
    orderBy: { scheduledAt: 'asc' },
  })
  return NextResponse.json({ meetings })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { customerName, email, scheduledAt, notes, zoomLink, sendSchedulingLink } = await request.json()
  if (!customerName || !customerName.trim()) {
    return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
  }

  if (sendSchedulingLink) {
    const token = randomBytes(16).toString('hex')
    const meeting = await prisma.meeting.create({
      data: {
        customerName: customerName.trim(),
        email: email && email.trim() ? email.trim() : null,
        notes: notes && notes.trim() ? notes.trim() : null,
        zoomLink: zoomLink && zoomLink.trim() ? zoomLink.trim() : null,
        pending: true,
        token,
      },
    })
    return NextResponse.json({ meeting })
  }

  if (!scheduledAt) {
    return NextResponse.json({ error: 'Meeting date/time is required' }, { status: 400 })
  }

  const parsedDate = parseWallClockAsUtc(scheduledAt)
  let finalZoomLink = zoomLink && zoomLink.trim() ? zoomLink.trim() : null
  let zoomMeetingId: string | null = null
  let zoomPassword: string | null = null
  if (!finalZoomLink) {
    const created = await createZoomMeeting(customerName.trim(), parsedDate.toISOString())
    if (created) {
      finalZoomLink = created.joinUrl
      zoomMeetingId = created.meetingId
      zoomPassword = created.password
    }
  }

  const meeting = await prisma.meeting.create({
    data: {
      customerName: customerName.trim(),
      email: email && email.trim() ? email.trim() : null,
      scheduledAt: parsedDate,
      notes: notes && notes.trim() ? notes.trim() : null,
      zoomLink: finalZoomLink,
      zoomMeetingId,
      zoomPassword,
    },
  })

      if (finalZoomLink) {
              const invite = meetingInviteEmail({
                        customerName: meeting.customerName,
                        scheduledAt: meeting.scheduledAt as Date,
                        zoomLink: finalZoomLink,
              })
              if (meeting.email) {
                        await sendEmail({ to: meeting.email, subject: invite.subject, html: invite.html })
              }
              await sendEmail({ to: BUSINESS.email, subject: invite.subject, html: invite.html })
      }
  return NextResponse.json({ meeting })
}
