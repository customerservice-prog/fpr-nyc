export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createZoomMeeting } from '@/lib/zoom'
import { sendEmail, meetingInviteEmail } from '@/lib/email'
import { BUSINESS } from '@/lib/utils'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const meeting = await prisma.meeting.findUnique({ where: { token } })
  if (!meeting) {
    return NextResponse.json({ error: 'This scheduling link is invalid.' }, { status: 404 })
  }
  if (!meeting.pending) {
    return NextResponse.json({
      customerName: meeting.customerName,
      notes: meeting.notes,
      alreadyScheduled: true,
      scheduledAt: meeting.scheduledAt,
      zoomLink: meeting.zoomLink,
    })
  }
  return NextResponse.json({
    customerName: meeting.customerName,
    notes: meeting.notes,
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const meeting = await prisma.meeting.findUnique({ where: { token } })
  if (!meeting || !meeting.pending) {
    return NextResponse.json({ error: 'This scheduling link is invalid or has already been used.' }, { status: 404 })
  }

  const body = await request.json()
  const { scheduledAt, note } = body
  if (!scheduledAt || typeof scheduledAt !== 'string') {
    return NextResponse.json({ error: 'A date and time is required.' }, { status: 400 })
  }

  const hasTimezone = /Z$|[+-]\d\d:\d\d$/.test(scheduledAt)
  const parsed = new Date(hasTimezone ? scheduledAt : scheduledAt + 'Z')
  if (isNaN(parsed.getTime())) {
    return NextResponse.json({ error: 'Invalid date and time.' }, { status: 400 })
  }

  const combinedNotes = note && note.trim()
    ? (meeting.notes ? meeting.notes + '\n\nClient note: ' + note.trim() : 'Client note: ' + note.trim())
    : meeting.notes

  let zoomLink = meeting.zoomLink
  let zoomMeetingId = meeting.zoomMeetingId
  let zoomPassword = meeting.zoomPassword
  if (!zoomLink) {
    const created = await createZoomMeeting(meeting.customerName, parsed.toISOString())
    if (created) {
      zoomLink = created.joinUrl
      zoomMeetingId = created.meetingId
      zoomPassword = created.password
    }
  }

  await prisma.meeting.update({
    where: { token },
    data: {
      scheduledAt: parsed,
      pending: false,
      notes: combinedNotes,
      zoomLink,
      zoomMeetingId,
      zoomPassword,
    },
  })

        if (zoomLink) {
                const invite = meetingInviteEmail({
                          customerName: meeting.customerName,
                          scheduledAt: parsed,
                          zoomLink,
                })
                if (meeting.email) {
                          await sendEmail({ to: meeting.email, subject: invite.subject, html: invite.html })
                }
                await sendEmail({ to: BUSINESS.email, subject: invite.subject, html: invite.html })
        }

  return NextResponse.json({ success: true, zoomLink })
}
