export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createZoomMeeting } from '@/lib/zoom'
import { createGoogleCalendarMeeting, getGoogleCalendarConnection } from '@/lib/googleCalendar'
import { sendEmail, meetingInviteEmail } from '@/lib/email'
import { BUSINESS } from '@/lib/utils'
import { parseMeetingWallClock, requireFutureMeeting } from '@/lib/meetingTime'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const meeting = await prisma.meeting.findUnique({ where: { token } })
  if (!meeting || meeting.cancelledAt) {
    return NextResponse.json({ error: 'This scheduling link is invalid.' }, { status: 404 })
  }
  if (!meeting.pending && !meeting.scheduledAt) {
    return NextResponse.json({ error: 'This booking is being processed. Please contact Friendly Party Rental if you need help.' }, { status: 409 })
  }
  if (!meeting.pending) {
    return NextResponse.json({
      customerName: meeting.customerName,
      alreadyScheduled: true,
      scheduledAt: meeting.scheduledAt,
      videoLink: meeting.googleMeetLink || meeting.zoomLink || '',
      provider: meeting.meetingProvider,
    })
  }
  return NextResponse.json({
    customerName: meeting.customerName,
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const meeting = await prisma.meeting.findUnique({ where: { token } })
  if (!meeting || !meeting.pending || meeting.cancelledAt) {
    return NextResponse.json({ error: 'This scheduling link is invalid or has already been used.' }, { status: 404 })
  }

  const body = await request.json()
  const { scheduledAt, note } = body
  if (!scheduledAt || typeof scheduledAt !== 'string') {
    return NextResponse.json({ error: 'A date and time is required.' }, { status: 400 })
  }

  let parsed: Date
  let instant: Date
  try {
    parsed = parseMeetingWallClock(scheduledAt)
    instant = requireFutureMeeting(parsed)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid date and time.' }, { status: 400 })
  }
  const candidateNote = typeof note === 'string' ? note.trim().slice(0, 2000) : ''
  const combinedNotes = candidateNote
    ? (meeting.notes ? meeting.notes + '\n\nCandidate note: ' + candidateNote : 'Candidate note: ' + candidateNote)
    : meeting.notes

  const googleConnection = await getGoogleCalendarConnection()
  // Claim this single-use link before creating an event or sending anything.
  // Concurrent submissions can no longer create duplicate provider meetings.
  const claim = await prisma.meeting.updateMany({
    where: { id: meeting.id, pending: true, cancelledAt: null, token },
    data: { pending: false },
  })
  if (claim.count !== 1) return NextResponse.json({ error: 'This scheduling link is already being used. Refresh to see the booking.' }, { status: 409 })
  if (googleConnection) {
    try {
      const google = await createGoogleCalendarMeeting({
        customerName: meeting.customerName,
        email: meeting.email,
        scheduledAt: parsed,
        durationMinutes: meeting.durationMinutes || 20,
        sendInvite: Boolean(meeting.email),
      })
      if (!google) throw new Error('Could not create the Google Calendar event.')

      await prisma.meeting.update({
        where: { token },
        data: {
          scheduledAt: parsed,
          pending: false,
          notes: combinedNotes,
          meetingProvider: 'google',
          invitedAt: meeting.email ? new Date() : null,
          googleEventId: google.eventId,
          googleMeetLink: google.meetLink,
          googleCalendarHtmlLink: google.htmlLink,
          zoomLink: null,
          zoomMeetingId: null,
          zoomPassword: null,
        },
      })

      return NextResponse.json({
        success: true,
        videoLink: google.meetLink || '',
        provider: 'google',
      })
    } catch (error) {
      console.error('Candidate Google Calendar scheduling failed', error)
      return NextResponse.json(
        { error: 'We could not finish scheduling. Please contact Friendly Party Rental so we can check the booking before trying again.' },
        { status: 502 }
      )
    }
  }

  let zoomLink = meeting.zoomLink
  let zoomMeetingId = meeting.zoomMeetingId
  let zoomPassword = meeting.zoomPassword
  if (!zoomLink) {
    const created = await createZoomMeeting(meeting.customerName, instant.toISOString(), meeting.durationMinutes || 20)
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
      meetingProvider: 'zoom',
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

  return NextResponse.json({ success: true, videoLink: zoomLink || '', provider: 'zoom' })
}

