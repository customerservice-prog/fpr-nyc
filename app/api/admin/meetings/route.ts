export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { createZoomMeeting } from '@/lib/zoom'
import { createGoogleCalendarMeeting, getGoogleCalendarConnection } from '@/lib/googleCalendar'
import { cleanMeetingDuration, cleanMeetingEmail, parseMeetingWallClock, requireFutureMeeting } from '@/lib/meetingTime'
import { sendEmail, meetingInviteEmail } from '@/lib/email'

async function authorize() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function GET() {
  const denied = await authorize()
  if (denied) return denied
  const meetings = await prisma.meeting.findMany({ orderBy: { scheduledAt: 'asc' } })
  return NextResponse.json({ meetings })
}

export async function POST(request: NextRequest) {
  const denied = await authorize()
  if (denied) return denied
  let createdGoogleEventId: string | null = null
  try {
    const body = await request.json()
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : ''
    if (!customerName || customerName.length > 200) return NextResponse.json({ error: 'Enter a candidate name of up to 200 characters.' }, { status: 400 })
    const email = cleanMeetingEmail(body.email)
    const notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 10000) || null : null
    const durationMinutes = cleanMeetingDuration(body.durationMinutes)
    const sendInvite = body.sendInvite === true
    if (sendInvite && !email) return NextResponse.json({ error: 'A candidate email is required to send an invitation.' }, { status: 400 })
    const googleConnection = await getGoogleCalendarConnection()
    const zoomLink = typeof body.zoomLink === 'string' ? body.zoomLink.trim() || null : null
    if (body.sendSchedulingLink === true) {
      const meeting = await prisma.meeting.create({ data: {
        customerName, email, notes, zoomLink, pending: true,
        token: randomBytes(16).toString('hex'), durationMinutes,
        meetingProvider: googleConnection ? 'google' : 'zoom',
      } })
      // Creating a scheduling link never sends it; staff explicitly share it.
      return NextResponse.json({ meeting })
    }
    const scheduledAt = parseMeetingWallClock(body.scheduledAt)
    const instant = requireFutureMeeting(scheduledAt)
    if (googleConnection) {
      const google = await createGoogleCalendarMeeting({ customerName, email, scheduledAt, durationMinutes, sendInvite })
      if (!google) throw new Error('Google Calendar is connected but the event could not be created.')
      createdGoogleEventId = google.eventId
      const meeting = await prisma.meeting.create({ data: {
        customerName, email, scheduledAt, notes, completed: false, pending: false,
        meetingProvider: 'google', durationMinutes, googleEventId: google.eventId,
        googleMeetLink: google.meetLink, googleCalendarHtmlLink: google.htmlLink,
        invitedAt: sendInvite ? new Date() : null,
      } })
      return NextResponse.json({ meeting, provider: 'google' })
    }
    let finalZoomLink = zoomLink
    let zoomMeetingId: string | null = null
    let zoomPassword: string | null = null
    if (!finalZoomLink) {
      const zoom = await createZoomMeeting(customerName, instant.toISOString(), durationMinutes)
      if (zoom) {
        finalZoomLink = zoom.joinUrl
        zoomMeetingId = zoom.meetingId
        zoomPassword = zoom.password
      }
    }
    if (sendInvite && !finalZoomLink) return NextResponse.json({ error: 'Connect Google Calendar or add a video link before sending an invitation.' }, { status: 400 })
    const meeting = await prisma.meeting.create({ data: {
      customerName, email, scheduledAt, notes, zoomLink: finalZoomLink,
      zoomMeetingId, zoomPassword, meetingProvider: 'zoom', durationMinutes,
    } })
    if (sendInvite && email && finalZoomLink) {
      const invite = meetingInviteEmail({ customerName, scheduledAt, zoomLink: finalZoomLink })
      const delivery = await sendEmail({ to: email, subject: invite.subject, html: invite.html })
      if (!delivery.success) throw new Error('The meeting was saved, but the invitation email could not be sent. Try sending the invitation from the meeting details.')
      const updated = await prisma.meeting.update({ where: { id: meeting.id }, data: { invitedAt: new Date() } })
      return NextResponse.json({ meeting: updated, provider: 'zoom' })
    }
    return NextResponse.json({ meeting, provider: 'zoom' })
  } catch (error) {
    if (createdGoogleEventId) return NextResponse.json({ error: 'Google Calendar created this meeting, but its app details could not be saved. Refresh to manage the existing calendar entry; do not create it again.', googleEventId: createdGoogleEventId, calendarUpdated: true }, { status: 502 })
    const status = error instanceof SyntaxError ? 400 : Number((error as { status?: number })?.status) || 502
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not create the interview.' }, { status })
  }
}
