export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { GoogleMeetingAction, manageGoogleCalendarEvent } from '@/lib/googleCalendar'
import { cleanMeetingDecision, cleanMeetingDuration, cleanMeetingEmail, parseMeetingWallClock, requireFutureMeeting } from '@/lib/meetingTime'
import { sendEmail, meetingInviteEmail } from '@/lib/email'

async function authorize() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

async function updateMeeting(request: NextRequest, id: string, forceCancel = false) {
  const denied = await authorize()
  if (denied) return denied
  let calendarUpdated = false
  try {
    const body = await request.json().catch(() => ({}))
    if (forceCancel) body.action = 'cancel'
    const meeting = await prisma.meeting.findUnique({ where: { id } })
    if (!meeting) return NextResponse.json({ error: 'Meeting not found.' }, { status: 404 })
    if (meeting.cancelledAt && body.action) {
      if (body.action === 'cancel') return NextResponse.json({ meeting, cancelled: true })
      return NextResponse.json({ error: 'This meeting is cancelled. Create a new meeting to schedule again.' }, { status: 409 })
    }
    if (body.action && !meeting.pending && !meeting.scheduledAt && meeting.token && !meeting.googleEventId) {
      return NextResponse.json({ error: 'A candidate booking is being processed. Refresh before changing this meeting.' }, { status: 409 })
    }
    if (!body.action) {
      const data: {
        completed?: boolean
        notes?: string
        zoomLink?: string
        candidateConfirmedAt?: Date | null
        linkSentAt?: Date | null
        decision?: string | null
      } = {}
      if (typeof body.completed === 'boolean') data.completed = body.completed
      if (typeof body.notes === 'string') data.notes = body.notes.slice(0, 10000)
      if (typeof body.zoomLink === 'string') data.zoomLink = body.zoomLink
      if (typeof body.candidateConfirmed === 'boolean') data.candidateConfirmedAt = body.candidateConfirmed ? new Date() : null
      if (typeof body.linkSent === 'boolean') data.linkSentAt = body.linkSent ? new Date() : null
      if ('decision' in body) data.decision = cleanMeetingDecision(body.decision)
      const updated = await prisma.meeting.update({ where: { id }, data })
      return NextResponse.json({ meeting: updated })
    }
    if (!['cancel', 'reschedule', 'invite'].includes(body.action)) return NextResponse.json({ error: 'Choose a valid meeting action.' }, { status: 400 })
    const action = body.action as GoogleMeetingAction['action']
    const scheduledAt = action === 'reschedule' ? parseMeetingWallClock(body.scheduledAt) : null
    const durationMinutes = action === 'reschedule' ? cleanMeetingDuration(body.durationMinutes) : meeting.durationMinutes
    if (scheduledAt) requireFutureMeeting(scheduledAt)
    const email = action === 'invite' ? cleanMeetingEmail(body.email || meeting.email) : meeting.email
    if (action === 'invite' && !email) return NextResponse.json({ error: 'A candidate email is required to send an invitation.' }, { status: 400 })
    if (meeting.googleEventId) {
      const result = await manageGoogleCalendarEvent(meeting.googleEventId, { ...body, action, email })
      calendarUpdated = true
      const updated = await prisma.meeting.update({ where: { id }, data: {
        ...(action === 'cancel' ? { cancelledAt: new Date(), pending: false, token: null } : {}),
        ...(action === 'reschedule' ? { scheduledAt, durationMinutes, pending: false, completed: false } : {}),
        ...(action === 'invite' ? { email, invitedAt: new Date() } : {}),
        ...(result.event ? { googleMeetLink: result.event.meetLink, googleCalendarHtmlLink: result.event.htmlLink } : {}),
      } })
      return NextResponse.json({ ...result, meeting: updated })
    }
    if (meeting.zoomMeetingId && action !== 'invite') {
      return NextResponse.json({ error: 'This legacy Zoom meeting must be changed in Zoom. Google Calendar meetings can be managed here.' }, { status: 409 })
    }
    if (action === 'invite') {
      if (meeting.invitedAt) return NextResponse.json({ error: 'An invitation has already been sent.' }, { status: 409 })
      if (!meeting.scheduledAt || !meeting.zoomLink) return NextResponse.json({ error: 'Set a meeting time and video link before sending an invitation.' }, { status: 400 })
      requireFutureMeeting(meeting.scheduledAt)
      const invite = meetingInviteEmail({ customerName: meeting.customerName, scheduledAt: meeting.scheduledAt, zoomLink: meeting.zoomLink })
      const delivery = await sendEmail({ to: email!, subject: invite.subject, html: invite.html })
      if (!delivery.success) throw new Error('The invitation email could not be sent. No invitation was marked as sent.')
    }
    const updated = await prisma.meeting.update({ where: { id }, data: {
      ...(action === 'cancel' ? { cancelledAt: new Date(), pending: false, token: null } : {}),
      ...(action === 'reschedule' ? { scheduledAt, durationMinutes, pending: false, completed: false } : {}),
      ...(action === 'invite' ? { email, invitedAt: new Date() } : {}),
    } })
    return NextResponse.json({ meeting: updated, ...(action === 'cancel' ? { cancelled: true } : {}) })
  } catch (error) {
    if (calendarUpdated) return NextResponse.json({ error: 'Google Calendar was updated, but the saved app details could not be updated. Refresh to see the current calendar state before trying again.', calendarUpdated: true }, { status: 502 })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update the meeting.' }, { status: Number((error as { status?: number })?.status) || 502 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateMeeting(request, (await params).id)
}

// Retain the old URL/method, but cancellation now also updates Google and
// preserves the history instead of silently deleting only the local record.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return updateMeeting(request, (await params).id, true)
}
